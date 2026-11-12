import type { HandoverPackage } from "@/lib/handover-package";
import type { Conversation } from "./chat-parsers";

export interface ArchiveEntry {
  path: string;
  size: number;
}

/** Readable content pulled out of a file. Saved alongside the original file. */
export type Extracted =
  | { kind: "text"; format: "plain" | "markdown" | "json"; text: string }
  | { kind: "html"; html: string; warnings: string[] }
  | { kind: "pages"; pages: string[] }
  | { kind: "sheets"; sheets: { name: string; rows: string[][]; truncated: boolean }[] }
  | { kind: "slides"; slides: { index: number; paragraphs: string[] }[] }
  | { kind: "chat"; source: "whatsapp" | "chatgpt"; conversations: Conversation[]; errors: string[] }
  | { kind: "archive"; entries: ArchiveEntry[]; skipped: { path: string; reason: string }[]; chat?: Extract<Extracted, { kind: "chat" }> }
  | { kind: "package"; data: HandoverPackage }
  | { kind: "image"; note: string }
  | { kind: "none"; reason: string };

/** Plain text for search/handover use; empty when the file had no extractable text. */
export function extractedText(e: Extracted): string {
  switch (e.kind) {
    case "text":
      return e.text;
    case "html":
      return e.html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    case "pages":
      return e.pages.join("\n\n");
    case "sheets":
      return e.sheets.map((s) => s.rows.map((r) => r.join("\t")).join("\n")).join("\n\n");
    case "slides":
      return e.slides.map((s) => s.paragraphs.join("\n")).join("\n\n");
    case "chat":
      return e.conversations.map((c) => c.messages.map((m) => `${m.sender}: ${m.text}`).join("\n")).join("\n\n");
    case "archive":
      return e.chat ? extractedText(e.chat) : "";
    default:
      return "";
  }
}

export function extractionSummary(e: Extracted): string {
  switch (e.kind) {
    case "text":
      return `Text extracted (${e.text.length.toLocaleString()} characters)`;
    case "html":
      return "Document text extracted";
    case "pages":
      return `${e.pages.length} page${e.pages.length === 1 ? "" : "s"} of text extracted`;
    case "sheets":
      return `${e.sheets.length} sheet${e.sheets.length === 1 ? "" : "s"} read`;
    case "slides":
      return `${e.slides.length} slide${e.slides.length === 1 ? "" : "s"} read`;
    case "chat": {
      const n = e.conversations.reduce((a, c) => a + c.messages.length, 0);
      return `${n.toLocaleString()} messages from ${e.conversations.length} conversation${e.conversations.length === 1 ? "" : "s"}`;
    }
    case "archive":
      return e.chat
        ? `ChatGPT export · ${e.chat.conversations.length} conversation${e.chat.conversations.length === 1 ? "" : "s"}`
        : `${e.entries.length} file${e.entries.length === 1 ? "" : "s"} listed${e.skipped.length ? ` · ${e.skipped.length} skipped` : ""}`;
    case "package":
      return "HandoverPulse package";
    case "image":
      return "Image stored · no text extraction";
    case "none":
      return "Stored · text extraction unavailable";
  }
}
