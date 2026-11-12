import type { DocumentKind } from "@/data/types";

/** Supported import formats. Validation is by extension, MIME type (when the browser gives one) and size. */
export type FileCategory = "document" | "data" | "presentation" | "archive" | "image";

interface FormatRule {
  label: string;
  category: FileCategory;
  kind: DocumentKind;
  /** Accepted MIME types. Browsers often report "" or a generic type, which are always tolerated. */
  mimes: string[];
}

const GENERIC_MIMES = ["", "application/octet-stream", "binary/octet-stream"];

export const FORMATS: Record<string, FormatRule> = {
  pdf: { label: "PDF", category: "document", kind: "pdf", mimes: ["application/pdf"] },
  doc: { label: "Word (DOC)", category: "document", kind: "doc", mimes: ["application/msword"] },
  docx: {
    label: "Word (DOCX)",
    category: "document",
    kind: "doc",
    mimes: ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
  },
  txt: { label: "Text (TXT)", category: "document", kind: "text", mimes: ["text/plain"] },
  md: { label: "Markdown (MD)", category: "document", kind: "text", mimes: ["text/markdown", "text/x-markdown", "text/plain"] },
  rtf: { label: "Rich Text (RTF)", category: "document", kind: "doc", mimes: ["application/rtf", "text/rtf"] },
  json: { label: "JSON", category: "data", kind: "code", mimes: ["application/json", "text/json", "text/plain"] },
  csv: {
    label: "CSV",
    category: "data",
    kind: "sheet",
    mimes: ["text/csv", "application/csv", "text/plain", "application/vnd.ms-excel"],
  },
  xls: { label: "Excel (XLS)", category: "data", kind: "sheet", mimes: ["application/vnd.ms-excel"] },
  xlsx: {
    label: "Excel (XLSX)",
    category: "data",
    kind: "sheet",
    mimes: ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
  },
  ppt: { label: "PowerPoint (PPT)", category: "presentation", kind: "slides", mimes: ["application/vnd.ms-powerpoint"] },
  pptx: {
    label: "PowerPoint (PPTX)",
    category: "presentation",
    kind: "slides",
    mimes: ["application/vnd.openxmlformats-officedocument.presentationml.presentation"],
  },
  zip: {
    label: "ZIP archive",
    category: "archive",
    kind: "archive",
    mimes: ["application/zip", "application/x-zip-compressed", "application/x-zip", "multipart/x-zip"],
  },
  png: { label: "PNG image", category: "image", kind: "image", mimes: ["image/png"] },
  jpg: { label: "JPG image", category: "image", kind: "image", mimes: ["image/jpeg", "image/pjpeg"] },
  jpeg: { label: "JPEG image", category: "image", kind: "image", mimes: ["image/jpeg", "image/pjpeg"] },
  webp: { label: "WEBP image", category: "image", kind: "image", mimes: ["image/webp"] },
};

export const MAX_FILE_BYTES = 25 * 1024 * 1024;

export const ACCEPT_ATTRIBUTE = Object.keys(FORMATS)
  .map((ext) => `.${ext}`)
  .join(",");

export const SUPPORTED_SUMMARY = "PDF, DOC, DOCX, TXT, MD, RTF, JSON, CSV, XLS, XLSX, PPT, PPTX, ZIP, PNG, JPG, JPEG, WEBP";

export function getExtension(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? name;
  const dot = base.lastIndexOf(".");
  return dot > 0 ? base.slice(dot + 1).toLowerCase() : "";
}

export function getFormat(name: string): (FormatRule & { ext: string }) | null {
  const ext = getExtension(name);
  const rule = FORMATS[ext];
  return rule ? { ...rule, ext } : null;
}

export type ValidationResult = { ok: true; ext: string } | { ok: false; error: string };

export function validateFile(file: { name: string; size: number; type: string }): ValidationResult {
  const ext = getExtension(file.name);
  if (!ext) return { ok: false, error: "This file has no extension, so its format can't be checked." };
  const rule = FORMATS[ext];
  if (!rule) return { ok: false, error: `.${ext} files aren't supported. Supported: ${SUPPORTED_SUMMARY}.` };
  if (file.size === 0) return { ok: false, error: "This file is empty." };
  if (file.size > MAX_FILE_BYTES) {
    return { ok: false, error: `This file is ${formatBytes(file.size)}; the limit is ${formatBytes(MAX_FILE_BYTES)}.` };
  }
  const mime = file.type.toLowerCase();
  if (!GENERIC_MIMES.includes(mime) && !rule.mimes.includes(mime)) {
    return { ok: false, error: `The file says it is “${file.type}”, which doesn't match a .${ext} file.` };
  }
  return { ok: true, ext };
}

/** Checks the first bytes so renamed or damaged files are rejected before parsing. */
export function checkSignature(ext: string, bytes: Uint8Array): string | null {
  const starts = (...sig: number[]) => sig.every((b, i) => bytes[i] === b);
  const ascii = (s: string) => starts(...Array.from(s, (c) => c.charCodeAt(0)));
  const isZip = starts(0x50, 0x4b, 0x03, 0x04) || starts(0x50, 0x4b, 0x05, 0x06);
  const isOle = starts(0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1);
  const fail = (what: string) => `This doesn't look like a valid ${what} file — it may be corrupted or renamed.`;
  switch (ext) {
    case "pdf":
      return ascii("%PDF") ? null : fail("PDF");
    case "docx":
    case "xlsx":
    case "pptx":
      return isZip ? null : fail(ext.toUpperCase());
    case "zip":
      return isZip ? null : fail("ZIP");
    case "doc":
    case "ppt":
      return isOle ? null : fail(ext.toUpperCase());
    case "xls":
      return isOle || isZip ? null : fail("XLS");
    case "rtf":
      return ascii("{\\rtf") ? null : fail("RTF");
    case "png":
      return starts(0x89, 0x50, 0x4e, 0x47) ? null : fail("PNG");
    case "jpg":
    case "jpeg":
      return starts(0xff, 0xd8, 0xff) ? null : fail("JPEG");
    case "webp":
      return ascii("RIFF") && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP" ? null : fail("WEBP");
    default:
      return null;
  }
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(bytes < 10 * 1024 ? 1 : 0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
