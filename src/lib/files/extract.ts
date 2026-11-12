/**
 * Browser-only content extraction. Heavy parsers are imported on demand so they never load during SSR.
 * Throws ExtractionError when a file is unreadable; never reports success for content it could not read.
 */
import { parseHandoverPackage } from "@/lib/handover-package";
import { looksLikeChatGpt, looksLikeWhatsApp, parseChatGpt, parseWhatsApp, rtfToText } from "./chat-parsers";
import type { ArchiveEntry, Extracted } from "./extracted";
import { sanitizeHtml } from "./sanitize-html";
import { findChatGptConversations, isUnsafeZipPath, MAX_ZIP_ENTRIES, MAX_ZIP_UNCOMPRESSED_BYTES } from "./zip-safety";
import { getFormat } from "./formats";

export class ExtractionError extends Error {}

const MAX_ROWS = 300;
const MAX_COLS = 40;

const decode = (buffer: ArrayBuffer) => new TextDecoder("utf-8").decode(buffer).replace(/^\uFEFF/, "");

async function extractPdf(buffer: ArrayBuffer): Promise<Extracted> {
  const pdfjs = await import("pdfjs-dist");
  const worker = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  // pdf.js takes ownership of the bytes it is given, so pass a copy.
  const task = pdfjs.getDocument({ data: new Uint8Array(buffer.slice(0)) });
  let pdf;
  try {
    pdf = await task.promise;
  } catch {
    throw new ExtractionError("This PDF couldn't be opened — it may be corrupted or password-protected.");
  }
  const pages: string[] = [];
  for (let n = 1; n <= pdf.numPages; n++) {
    const page = await pdf.getPage(n);
    const content = await page.getTextContent();
    let text = "";
    for (const item of content.items) {
      if ("str" in item) text += item.str + (item.hasEOL ? "\n" : "");
    }
    pages.push(text.trim());
  }
  await task.destroy();
  if (!pages.some(Boolean)) {
    return { kind: "none", reason: "This PDF has no selectable text (it may be scanned images). OCR isn't configured, so no text was extracted." };
  }
  return { kind: "pages", pages };
}

async function extractDocx(buffer: ArrayBuffer): Promise<Extracted> {
  const mammoth = await import("mammoth");
  try {
    const result = await mammoth.convertToHtml({ arrayBuffer: buffer });
    return { kind: "html", html: sanitizeHtml(result.value), warnings: result.messages.map((m) => m.message).slice(0, 5) };
  } catch {
    throw new ExtractionError("This Word document couldn't be read — it may be corrupted.");
  }
}

async function extractSheets(ext: string, buffer: ArrayBuffer): Promise<Extracted> {
  const XLSX = await import("xlsx");
  let wb;
  try {
    wb = ext === "csv" ? XLSX.read(decode(buffer), { type: "string" }) : XLSX.read(new Uint8Array(buffer), { type: "array" });
  } catch {
    throw new ExtractionError(`This ${ext.toUpperCase()} file couldn't be read — it may be corrupted.`);
  }
  const sheets = wb.SheetNames.map((name) => {
    const sheet = wb.Sheets[name];
    const all = sheet ? XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, blankrows: false, defval: "" }) : [];
    const rows = all.slice(0, MAX_ROWS).map((r) => r.slice(0, MAX_COLS).map((c) => (c == null ? "" : String(c))));
    return { name, rows, truncated: all.length > MAX_ROWS };
  });
  if (!sheets.some((s) => s.rows.length)) throw new ExtractionError("This spreadsheet has no readable cells.");
  return { kind: "sheets", sheets };
}

async function extractPptx(buffer: ArrayBuffer): Promise<Extracted> {
  const { default: JSZip } = await import("jszip");
  let zip;
  try {
    zip = await JSZip.loadAsync(buffer);
  } catch {
    throw new ExtractionError("This PowerPoint file couldn't be opened — it may be corrupted.");
  }
  const slideFiles = Object.keys(zip.files)
    .filter((p) => /^ppt\/slides\/slide\d+\.xml$/.test(p))
    .sort((a, b) => Number(/(\d+)\.xml$/.exec(a)?.[1]) - Number(/(\d+)\.xml$/.exec(b)?.[1]));
  if (!slideFiles.length) throw new ExtractionError("No slides were found in this PowerPoint file.");
  const parser = new DOMParser();
  const slides = [];
  for (const [i, path] of slideFiles.entries()) {
    const xml = parser.parseFromString(await zip.file(path)!.async("string"), "application/xml");
    const paragraphs = Array.from(xml.getElementsByTagName("a:p"))
      .map((p) => Array.from(p.getElementsByTagName("a:t")).map((t) => t.textContent ?? "").join(""))
      .filter((t) => t.trim());
    slides.push({ index: i + 1, paragraphs });
  }
  return { kind: "slides", slides };
}

async function extractZip(buffer: ArrayBuffer): Promise<Extracted> {
  const { default: JSZip } = await import("jszip");
  let zip;
  try {
    zip = await JSZip.loadAsync(buffer);
  } catch {
    throw new ExtractionError("This ZIP archive couldn't be opened — it may be corrupted.");
  }
  const files = Object.values(zip.files);
  if (files.length > MAX_ZIP_ENTRIES) {
    throw new ExtractionError(`This archive has ${files.length.toLocaleString()} entries; the limit is ${MAX_ZIP_ENTRIES.toLocaleString()}.`);
  }
  const entries: ArchiveEntry[] = [];
  const skipped: { path: string; reason: string }[] = [];
  let total = 0;
  for (const f of files) {
    if (f.dir) continue;
    if (isUnsafeZipPath(f.name)) {
      skipped.push({ path: f.name, reason: "Unsafe path — ignored" });
      continue;
    }
    const size = (f as unknown as { _data?: { uncompressedSize?: number } })._data?.uncompressedSize ?? 0;
    total += size;
    entries.push({ path: f.name, size });
    if (!getFormat(f.name)) skipped.push({ path: f.name, reason: "Unsupported format — listed only" });
  }
  if (total > MAX_ZIP_UNCOMPRESSED_BYTES) {
    throw new ExtractionError("This archive expands to more than 300 MB, so it wasn't processed.");
  }
  if (!entries.length) throw new ExtractionError("This archive contains no files.");
  const convPath = findChatGptConversations(entries.map((e) => e.path));
  if (convPath) {
    let json: unknown;
    try {
      json = JSON.parse(await zip.file(convPath)!.async("string"));
    } catch {
      skipped.push({ path: convPath, reason: "conversations.json isn't valid JSON" });
    }
    if (json !== undefined) {
      const { conversations, errors } = parseChatGpt(json);
      if (conversations.length) {
        return { kind: "archive", entries, skipped, chat: { kind: "chat", source: "chatgpt", conversations, errors } };
      }
      skipped.push({ path: convPath, reason: errors[0] ?? "No readable conversations" });
    }
  }
  return { kind: "archive", entries, skipped };
}

async function checkImage(buffer: ArrayBuffer, mime: string): Promise<Extracted> {
  try {
    const bitmap = await createImageBitmap(new Blob([buffer], { type: mime }));
    bitmap.close();
  } catch {
    throw new ExtractionError("This image couldn't be decoded — it may be corrupted.");
  }
  return { kind: "image", note: "OCR isn't configured, so no text was extracted from this image." };
}

export async function extractContent(ext: string, buffer: ArrayBuffer, mime = ""): Promise<Extracted> {
  switch (ext) {
    case "pdf":
      return extractPdf(buffer);
    case "docx":
      return extractDocx(buffer);
    case "doc":
      return { kind: "none", reason: "Text extraction isn't available for legacy .doc files. The original file is kept — download it to open." };
    case "ppt":
      return { kind: "none", reason: "Text extraction isn't available for legacy .ppt files. The original file is kept — download it to open." };
    case "pptx":
      return extractPptx(buffer);
    case "csv":
    case "xls":
    case "xlsx":
      return extractSheets(ext, buffer);
    case "zip":
      return extractZip(buffer);
    case "rtf": {
      const text = rtfToText(decode(buffer));
      if (!text) throw new ExtractionError("No readable text was found in this RTF file.");
      return { kind: "text", format: "plain", text };
    }
    case "md":
      return { kind: "text", format: "markdown", text: decode(buffer) };
    case "txt": {
      const text = decode(buffer);
      if (looksLikeWhatsApp(text)) {
        const { conversation, errors } = parseWhatsApp(text);
        return { kind: "chat", source: "whatsapp", conversations: [conversation], errors };
      }
      return { kind: "text", format: "plain", text };
    }
    case "json": {
      const text = decode(buffer);
      let json: unknown;
      try {
        json = JSON.parse(text);
      } catch {
        throw new ExtractionError("This file isn't valid JSON.");
      }
      if (json && typeof json === "object" && (json as { format?: unknown }).format === "handoverpulse.package") {
        const pkg = parseHandoverPackage(text);
        if (!pkg.ok) throw new ExtractionError(pkg.error);
        return { kind: "package", data: pkg.data };
      }
      if (looksLikeChatGpt(json)) {
        const { conversations, errors } = parseChatGpt(json);
        if (!conversations.length) throw new ExtractionError(errors[0] ?? "No readable conversations were found.");
        return { kind: "chat", source: "chatgpt", conversations, errors };
      }
      return { kind: "text", format: "json", text: JSON.stringify(json, null, 2) };
    }
    case "png":
    case "jpg":
    case "jpeg":
    case "webp":
      return checkImage(buffer, mime || `image/${ext === "jpg" ? "jpeg" : ext}`);
    default:
      throw new ExtractionError("This format isn't supported.");
  }
}
