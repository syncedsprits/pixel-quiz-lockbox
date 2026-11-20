/**
 * Builds the redacted copy of a shared upload that users receive (preview and download).
 * The original stays private and unchanged in storage. Formats that can't be read as text are
 * refused (flagged) so their unmasked content is never served.
 */
import { isScannableUpload, maskSensitiveText, redactedFileName } from "./masking";

export type Redacted =
  | { ok: true; body: string; contentType: string; fileName: string; masked: number }
  | { ok: false; reason: string };

const decodeXml = (s: string) =>
  s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&amp;/g, "&");

async function docxText(bytes: Uint8Array): Promise<string> {
  const JSZip = (await import("jszip")).default;
  const zip = await JSZip.loadAsync(bytes);
  const xml = await zip.file("word/document.xml")?.async("string");
  if (!xml) throw new Error("DOCX has no document body");
  return xml
    .split(/<\/w:p>/)
    .map((p) => {
      const withBreaks = p.replace(/<w:tab\/>/g, "\t").replace(/<w:br[^>]*\/>/g, "\n");
      return decodeXml([...withBreaks.matchAll(/<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>|(\t|\n)/g)].map((m) => m[1] ?? m[2] ?? "").join("")).trim();
    })
    .filter(Boolean)
    .join("\n\n");
}

async function pdfText(bytes: Uint8Array): Promise<string> {
  const { extractText, getDocumentProxy } = await import("unpdf");
  const pdf = await getDocumentProxy(bytes);
  const { text } = await extractText(pdf, { mergePages: false });
  return (text as string[]).map((t, i) => `[Page ${i + 1}]\n${t.trim()}`).join("\n\n");
}

const MIME: Record<string, string> = {
  txt: "text/plain; charset=utf-8",
  md: "text/markdown; charset=utf-8",
  csv: "text/csv; charset=utf-8",
  json: "application/json; charset=utf-8",
};

export async function redactUpload(name: string, ext: string, bytes: Uint8Array): Promise<Redacted> {
  const e = ext.toLowerCase();
  if (!isScannableUpload(e)) return { ok: false, reason: "unsupported" };
  let text: string;
  try {
    if (e === "pdf") text = await pdfText(bytes);
    else if (e === "docx") text = await docxText(bytes);
    else text = new TextDecoder("utf-8").decode(bytes).replace(/^\uFEFF/, "");
  } catch {
    return { ok: false, reason: "unreadable" };
  }
  if (!text.replace(/\[Page \d+\]/g, "").trim()) return { ok: false, reason: "no-text" };
  const masked = maskSensitiveText(text);
  return {
    ok: true,
    body: masked.text,
    contentType: MIME[e] ?? "text/plain; charset=utf-8",
    fileName: redactedFileName(name, e),
    masked: masked.count,
  };
}
