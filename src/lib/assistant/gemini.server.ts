/** Server-only Google Gemini client. The key is read from GEMINI_API_KEY at call time and never leaves the server. */
export const GEMINI_MODEL = "gemini-2.5-flash";

export type GeminiTurn = { role: "user" | "assistant"; content: string };

export class GeminiError extends Error {
  constructor(
    public kind: "missing_key" | "rate_limit" | "auth" | "blocked" | "unavailable" | "bad_request",
    message: string,
  ) {
    super(message);
  }
}

/** Maps an HTTP status from the Gemini API to an error kind. */
export function geminiErrorKind(status: number): GeminiError["kind"] {
  if (status === 429) return "rate_limit";
  if (status === 401 || status === 403) return "auth";
  if (status === 400 || status === 404) return "bad_request";
  return "unavailable";
}

export async function geminiGenerate(system: string, turns: GeminiTurn[]): Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new GeminiError("missing_key", "GEMINI_API_KEY is not set");

  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: turns.map((t) => ({ role: t.role === "assistant" ? "model" : "user", parts: [{ text: t.content }] })),
      generationConfig: { temperature: 0.3 },
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error("[gemini] HTTP", res.status, body.slice(0, 500));
    throw new GeminiError(geminiErrorKind(res.status), `Gemini HTTP ${res.status}`);
  }
  const json = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[];
    promptFeedback?: { blockReason?: string };
  };
  if (json.promptFeedback?.blockReason) throw new GeminiError("blocked", json.promptFeedback.blockReason);
  const cand = json.candidates?.[0];
  const text = (cand?.content?.parts ?? []).map((p) => p.text ?? "").join("").trim();
  if (!text && cand?.finishReason === "SAFETY") throw new GeminiError("blocked", "SAFETY");
  return text;
}
