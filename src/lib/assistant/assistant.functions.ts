import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

import { MAX_HISTORY_MESSAGES, MAX_QUESTION_CHARS } from "./policy";

export type AssistantReply =
  | {
      ok: true;
      answer: string;
      sources: string[];
      /** Documents were left out because this visitor hasn't unlocked the project's files. */
      documentsLocked: boolean;
    }
  | { ok: false; error: string };

export const assistantInputSchema = z.object({
  projectId: z.string().min(1).max(64),
  question: z.string().trim().min(1).max(MAX_QUESTION_CHARS),
  history: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(12000) }))
    .max(MAX_HISTORY_MESSAGES),
});

export const askAssistant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => assistantInputSchema.parse(d))
  .handler(async ({ data, context }): Promise<AssistantReply> => {
    const { runAskAssistant } = await import("./assistant-ops.server");
    return runAskAssistant(data, context.userId);
  });
