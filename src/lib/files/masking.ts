/**
 * Sensitive-information detection and masking for uploaded documents. Pure functions shared by the
 * browser (upload summary) and the server (redacted previews/downloads, AI context).
 * Rules: phone and account/ID numbers keep only their last 2 digits (other digits become X);
 * passwords, API keys, tokens and credentials are replaced entirely with XXXXXXXX.
 */
import type { Extracted } from "./extracted";

export const FULL_MASK = "XXXXXXXX";

/** Upload formats the server can read as text and serve as a genuinely redacted copy. Everything else is flagged. */
export const SCANNABLE_UPLOAD_EXTENSIONS = ["txt", "md", "csv", "json", "pdf", "docx"] as const;
/** Formats whose redacted copy is plain text rather than the original format. */
export const TEXT_ONLY_REDACTION_EXTENSIONS = ["pdf", "docx"] as const;

export const FLAGGED_MESSAGE =
  "Flagged for manual review: this file's content couldn't be scanned for sensitive information, so it can't be previewed, downloaded or used by the AI.";

export function isScannableUpload(ext: string): boolean {
  return (SCANNABLE_UPLOAD_EXTENSIONS as readonly string[]).includes(ext.toLowerCase());
}

/** File name of the redacted copy served to users. */
export function redactedFileName(name: string, ext: string): string {
  return (TEXT_ONLY_REDACTION_EXTENSIONS as readonly string[]).includes(ext.toLowerCase()) ? `${name}.redacted.txt` : name;
}

export type MaskKind = "credential" | "account" | "id" | "phone";
export interface MaskResult {
  text: string;
  count: number;
  kinds: MaskKind[];
}

/** Replaces every digit except the last 2 with X; other characters (spaces, dashes, +) are kept. */
export function keepLastTwoDigits(value: string): string {
  const total = (value.match(/\d/g) ?? []).length;
  let seen = 0;
  return value.replace(/[0-9A-Za-z]/g, (ch) => {
    if (/\d/.test(ch)) {
      seen++;
      return seen > total - 2 ? ch : "X";
    }
    return "X";
  });
}

const CRED_LABEL =
  "(?:password|passwd|passcode|pwd|pin|secret|client[ _-]?secret|api[ _-]?key|apikey|access[ _-]?key|secret[ _-]?key|private[ _-]?key|auth[ _-]?token|access[ _-]?token|refresh[ _-]?token|token|bearer|credentials?)";

const KEY_PATTERNS: RegExp[] = [
  /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g,
  /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g, // JWT
  /\b(?:sk|pk|rk)[-_](?:live|test|proj)?[-_]?[A-Za-z0-9_-]{16,}\b/g, // OpenAI / Stripe style
  /\bsb_(?:secret|publishable)_[A-Za-z0-9_-]{10,}\b/g,
  /\bAIza[0-9A-Za-z_-]{30,}\b/g, // Google
  /\bgh[pousr]_[A-Za-z0-9]{20,}\b/g, // GitHub
  /\bxox[abprs]-[A-Za-z0-9-]{10,}\b/g, // Slack
  /\bAKIA[0-9A-Z]{16}\b/g, // AWS
  /\b(?=[A-Za-z0-9_-]*\d)(?=[A-Za-z0-9_-]*[A-Za-z])[A-Za-z0-9_-]{32,}\b/g, // long random tokens
];

/** Masks sensitive values in plain text. */
export function maskSensitiveText(input: string): MaskResult {
  let count = 0;
  const kinds = new Set<MaskKind>();
  const hit = (k: MaskKind) => {
    count++;
    kinds.add(k);
  };
  let text = input;

  // 1. Labelled credentials: "password: hunter2", "API_KEY=abc", "token - xyz"
  text = text.replace(new RegExp(`(\\b${CRED_LABEL}\\b["']?\\s*(?:[:=]|is|-|→)\\s*["']?)([^\\s"',;]+)`, "gi"), (_m, label: string, value: string) => {
    if (value === FULL_MASK) return label + value;
    hit("credential");
    return label + FULL_MASK;
  });
  // Authorization headers
  text = text.replace(/\b(Bearer|Basic)\s+([A-Za-z0-9._~+/=-]{8,})/g, (_m, scheme: string) => {
    hit("credential");
    return `${scheme} ${FULL_MASK}`;
  });
  // 2. Key / token shapes without a label
  for (const re of KEY_PATTERNS) {
    text = text.replace(re, (m) => {
      if (m.includes(FULL_MASK)) return m;
      hit("credential");
      return FULL_MASK;
    });
  }
  // 3. Labelled account / bank / card numbers
  text = text.replace(
    /(\b(?:account|acct|a\/c|ac|iban|bank|card|credit card|debit card|routing|sort code|swift|ifsc|upi)\b[^\n:=#]{0,20}?(?:no\.?|number|num|#)?\s*[:=#-]?\s*)([A-Z]{0,4}[0-9][0-9 -]{4,32}[0-9A-Z])/gi,
    (_m, label: string, value: string) => {
      hit("account");
      return label + keepLastTwoDigits(value);
    },
  );
  // IBAN without a label
  text = text.replace(/\b[A-Z]{2}\d{2}(?: ?[A-Z0-9]{4}){3,7}(?: ?[A-Z0-9]{1,3})?\b/g, (m) => {
    if (!/\d{6,}/.test(m.replace(/ /g, ""))) return m;
    hit("account");
    return keepLastTwoDigits(m);
  });
  // Card numbers (13–19 digits in groups)
  text = text.replace(/\b\d{4}(?:[ -]?\d{4}){2}[ -]?\d{1,7}\b/g, (m) => {
    const n = m.replace(/\D/g, "").length;
    if (n < 13 || n > 19) return m;
    hit("account");
    return keepLastTwoDigits(m);
  });
  // 4. Confidential identification numbers: US SSN, Indian PAN, labelled IDs/passports
  text = text.replace(/\b\d{3}-\d{2}-\d{4}\b/g, (m) => {
    hit("id");
    return keepLastTwoDigits(m);
  });
  text = text.replace(/\b[A-Z]{5}\d{4}[A-Z]\b/g, (m) => {
    hit("id");
    return keepLastTwoDigits(m);
  });
  text = text.replace(
    /(\b(?:ssn|social security|aadhaa?r|pan|passport|national id|id number|employee id|customer id|tax id|tin|license|licence)\b[^\n:=#]{0,12}?(?:no\.?|number|#)?\s*[:=#-]?\s*)([A-Z0-9][A-Z0-9 -]{4,24}[0-9])/gi,
    (_m, label: string, value: string) => {
      if (!/\d{4,}/.test(value.replace(/[ -]/g, ""))) return _m;
      hit("id");
      return label + keepLastTwoDigits(value);
    },
  );
  // 5. Phone / mobile numbers: 10–15 digits, optional +country code and separators
  text = text.replace(/(?<![\w.\/:-])\+?\(?\d[\d ().-]{8,20}\d(?![\w\/:-]|\.\d)/g, (m) => {
    const digits = m.replace(/\D/g, "").length;
    if (digits < 10 || digits > 15) return m;
    if (/^\d{4}-\d{2}-\d{2}/.test(m) || /^\d{1,4}\.\d{1,4}\.\d/.test(m)) return m; // dates, versions, IPs
    hit("phone");
    return keepLastTwoDigits(m);
  });

  return { text, count, kinds: [...kinds] };
}

/** Masks sensitive values in every text part of extracted content (HTML tags are left intact). */
export function maskExtracted(e: Extracted): { extracted: Extracted; count: number } {
  let count = 0;
  const m = (s: string) => {
    const r = maskSensitiveText(s);
    count += r.count;
    return r.text;
  };
  let out: Extracted;
  switch (e.kind) {
    case "text":
      out = { ...e, text: m(e.text) };
      break;
    case "html":
      out = { ...e, html: e.html.split(/(<[^>]*>)/).map((part) => (part.startsWith("<") ? part : m(part))).join("") };
      break;
    case "pages":
      out = { ...e, pages: e.pages.map(m) };
      break;
    case "sheets":
      out = { ...e, sheets: e.sheets.map((s) => ({ ...s, rows: s.rows.map((r) => r.map(m)) })) };
      break;
    case "slides":
      out = { ...e, slides: e.slides.map((s) => ({ ...s, paragraphs: s.paragraphs.map(m) })) };
      break;
    case "chat":
      out = { ...e, conversations: e.conversations.map((c) => ({ ...c, messages: c.messages.map((x) => ({ ...x, text: m(x.text) })) })) };
      break;
    case "archive":
      out = e.chat ? { ...e, chat: maskExtracted(e.chat).extracted as Extract<Extracted, { kind: "chat" }> } : e;
      if (e.chat) count += maskExtracted(e.chat).count;
      break;
    default:
      out = e;
  }
  return { extracted: out, count };
}

/** Short scan note added to an upload's summary. */
export function scanNote(ext: string, count: number): string {
  if (!isScannableUpload(ext)) return "Flagged for manual review";
  return count ? `${count} sensitive item${count === 1 ? "" : "s"} masked` : "Scanned · no sensitive data found";
}
