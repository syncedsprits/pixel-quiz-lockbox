/** Assistant wording and limits shared by the server and the page. */
export const OFF_TOPIC_REPLY =
  "I'm your Project AI Assistant. I can answer questions related to this project's architecture, hardware, software, working principle, implementation, and documentation. Please ask me something related to the project.";

export const NOT_DOCUMENTED_REPLY =
  "This information is not available in the current project documentation. Please provide the relevant details so I can answer accurately.";

export const MAX_QUESTION_CHARS = 2000;
export const MAX_HISTORY_MESSAGES = 12;

export type ChatTurn = { role: "user" | "assistant"; content: string };

/** Splits extracted document text into overlapping chunks on paragraph boundaries. */
export function chunkText(text: string, size = 1200, overlap = 200): string[] {
  const paras = text
    .split(/\n\s*\n|\n(?=\[Page \d+\])/)
    .map((p) => p.replace(/[ \t]+/g, " ").trim())
    .filter(Boolean);
  const chunks: string[] = [];
  let cur = "";
  for (const p of paras) {
    if (cur && cur.length + p.length + 2 > size) {
      chunks.push(cur);
      cur = cur.slice(Math.max(0, cur.length - overlap));
      const cut = cur.indexOf(" ");
      cur = cut > 0 ? cur.slice(cut + 1) : cur;
    }
    if (p.length > size) {
      for (let i = 0; i < p.length; i += size - overlap) {
        const part = p.slice(i, i + size);
        if (cur) {
          chunks.push(cur);
          cur = "";
        }
        chunks.push(part);
      }
      continue;
    }
    cur = cur ? `${cur}\n\n${p}` : p;
  }
  if (cur.trim()) chunks.push(cur);
  return chunks;
}
