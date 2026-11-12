/** Parsers for exported chats. Pure functions so they can be tested without a browser. */

export interface ChatMessage {
  at?: string;
  sender: string;
  text: string;
}

export interface Conversation {
  title?: string;
  createdAt?: string;
  messages: ChatMessage[];
}

// "12/31/23, 9:41 PM - Name: text"  |  "31/12/2023, 21:41 - Name: text"
const WA_DASH = /^(\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}),?\s+(\d{1,2}:\d{2}(?::\d{2})?(?:\s?[APap]\.?[Mm]\.?)?)\s+[-–]\s+(.*)$/;
// "[31/12/2023, 21:41:05] Name: text"
const WA_BRACKET = /^\u200e?\[(\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}),?\s+(\d{1,2}:\d{2}(?::\d{2})?(?:\s?[APap]\.?[Mm]\.?)?)\]\s+(.*)$/;

export interface WhatsAppResult {
  conversation: Conversation;
  /** Lines that started like a message but could not be read. */
  errors: string[];
}

function matchLine(line: string) {
  const m = WA_BRACKET.exec(line) ?? WA_DASH.exec(line);
  if (!m) return null;
  return { date: m[1] ?? "", time: m[2] ?? "", rest: m[3] ?? "" };
}

/** True when enough lines look like a WhatsApp export. */
export function looksLikeWhatsApp(text: string): boolean {
  const lines = text.split(/\r?\n/).filter((l) => l.trim()).slice(0, 50);
  if (!lines.length) return false;
  const hits = lines.filter((l) => matchLine(l)).length;
  return hits >= Math.min(3, lines.length) && hits / lines.length >= 0.3;
}

export function parseWhatsApp(text: string): WhatsAppResult {
  const messages: ChatMessage[] = [];
  const errors: string[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/\u200e/g, "");
    if (!line.trim()) continue;
    const m = matchLine(line);
    if (m) {
      const colon = m.rest.indexOf(": ");
      const at = `${m.date} ${m.time}`.trim();
      if (colon > 0) {
        messages.push({ at, sender: m.rest.slice(0, colon).trim(), text: m.rest.slice(colon + 2) });
      } else {
        // System lines such as "Messages are end-to-end encrypted" have no sender.
        messages.push({ at, sender: "System", text: m.rest });
      }
    } else if (messages.length) {
      const last = messages[messages.length - 1]!;
      last.text += `\n${line}`;
    } else {
      errors.push(line.slice(0, 120));
    }
  }
  return { conversation: { title: "WhatsApp chat", messages }, errors };
}

interface ChatGptNode {
  parent?: string | null;
  children?: string[];
  message?: {
    author?: { role?: string };
    create_time?: number | null;
    content?: { content_type?: string; parts?: unknown[]; text?: string };
  } | null;
}

interface ChatGptConversation {
  title?: string;
  create_time?: number;
  mapping?: Record<string, ChatGptNode>;
  current_node?: string;
}

const toIso = (t: number | null | undefined) => (typeof t === "number" && t > 0 ? new Date(t * 1000).toISOString() : undefined);

export function looksLikeChatGpt(json: unknown): boolean {
  const list = Array.isArray(json) ? json : null;
  return !!list && list.length > 0 && list.every((c) => c && typeof c === "object" && "mapping" in c);
}

function partText(part: unknown): string {
  if (typeof part === "string") return part;
  if (part && typeof part === "object" && "text" in part && typeof (part as { text: unknown }).text === "string") {
    return (part as { text: string }).text;
  }
  return "";
}

/** Reads a ChatGPT data export (conversations.json). Follows the active branch of each conversation. */
export function parseChatGpt(json: unknown): { conversations: Conversation[]; errors: string[] } {
  if (!looksLikeChatGpt(json)) return { conversations: [], errors: ["This JSON isn't a ChatGPT conversations export."] };
  const conversations: Conversation[] = [];
  const errors: string[] = [];
  (json as ChatGptConversation[]).forEach((c, i) => {
    const mapping = c.mapping ?? {};
    const ids: string[] = [];
    let cursor: string | undefined = c.current_node && mapping[c.current_node] ? c.current_node : undefined;
    if (cursor) {
      const seen = new Set<string>();
      while (cursor && mapping[cursor] && !seen.has(cursor)) {
        seen.add(cursor);
        ids.unshift(cursor);
        cursor = mapping[cursor]?.parent ?? undefined;
      }
    } else {
      ids.push(...Object.keys(mapping));
    }
    const messages: ChatMessage[] = [];
    for (const id of ids) {
      const msg = mapping[id]?.message;
      if (!msg) continue;
      const role = msg.author?.role ?? "unknown";
      if (role === "system" || role === "tool") continue;
      const text = (msg.content?.parts ?? []).map(partText).join("\n").trim() || (msg.content?.text ?? "").trim();
      if (!text) continue;
      const at = toIso(msg.create_time);
      messages.push({ sender: role === "user" ? "You" : role === "assistant" ? "ChatGPT" : role, text, ...(at ? { at } : {}) });
    }
    if (!messages.length) {
      errors.push(`Conversation ${i + 1}${c.title ? ` (“${c.title}”)` : ""} had no readable messages.`);
      return;
    }
    const createdAt = toIso(c.create_time);
    conversations.push({ messages, ...(c.title ? { title: c.title } : {}), ...(createdAt ? { createdAt } : {}) });
  });
  return { conversations, errors };
}

/** Strips RTF control words to plain text. Good enough for readable previews of simple documents. */
export function rtfToText(rtf: string): string {
  let out = "";
  let depth = 0;
  const skipDepths: number[] = [];
  for (let i = 0; i < rtf.length; i++) {
    const ch = rtf[i];
    if (ch === "{") {
      depth++;
      continue;
    }
    if (ch === "}") {
      if (skipDepths[skipDepths.length - 1] === depth) skipDepths.pop();
      depth--;
      continue;
    }
    const skipping = skipDepths.length > 0;
    if (ch === "\\") {
      const next = rtf[i + 1];
      if (next === "\\" || next === "{" || next === "}") {
        if (!skipping) out += next;
        i++;
        continue;
      }
      if (next === "'") {
        const hex = rtf.slice(i + 2, i + 4);
        if (!skipping) out += String.fromCharCode(parseInt(hex, 16));
        i += 3;
        continue;
      }
      if (next === "*") {
        skipDepths.push(depth);
        i++;
        continue;
      }
      const m = /^\\([a-zA-Z]+)(-?\d+)? ?/.exec(rtf.slice(i));
      if (m) {
        const word = m[1];
        if (["fonttbl", "colortbl", "stylesheet", "info", "pict", "header", "footer"].includes(word ?? "")) skipDepths.push(depth);
        if (!skipping && (word === "par" || word === "line")) out += "\n";
        if (!skipping && word === "tab") out += "\t";
        i += m[0].length - 1;
        continue;
      }
      continue;
    }
    if (!skipping && ch !== "\r" && ch !== "\n") out += ch;
  }
  return out.replace(/\n{3,}/g, "\n\n").trim();
}
