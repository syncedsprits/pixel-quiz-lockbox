import { askAssistant as askAssistantFn, type AssistantReply } from "./assistant.functions";

/**
 * Asks the project assistant on this site's own server (Lovable hosting or Vercel). AI generation
 * always runs here with Gemini; it is never forwarded to the Lovable-hosted backend.
 */
export function askAssistant({
  data,
}: {
  data: { projectId: string; question: string; history: { role: "user" | "assistant"; content: string }[] };
}): Promise<AssistantReply> {
  return askAssistantFn({ data });
}
