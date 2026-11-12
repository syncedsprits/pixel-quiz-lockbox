import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { getProject } from "@/data/projects";
import { MAX_HISTORY_MESSAGES, MAX_QUESTION_CHARS, NOT_DOCUMENTED_REPLY, OFF_TOPIC_REPLY } from "./policy";
import { projectDetailsText } from "./project-context";

export type AssistantReply =
  | {
      ok: true;
      answer: string;
      sources: string[];
      /** Documents were left out because this visitor hasn't unlocked the project's files. */
      documentsLocked: boolean;
    }
  | { ok: false; error: string };

const inputSchema = z.object({
  projectId: z.string().min(1).max(64),
  question: z.string().trim().min(1).max(MAX_QUESTION_CHARS),
  history: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(12000) }))
    .max(MAX_HISTORY_MESSAGES),
});

function instructions(projectName: string, documentsLocked: boolean, hasDocuments: boolean): string {
  return `You are the Project AI Assistant for one project only: "${projectName}".
You are a knowledgeable technical assistant for this project (hardware, sensors, microcontrollers, communication, circuit/pin connections, software, AI/ML, working principle, data flow, algorithms, specifications, testing, advantages, limitations, applications, future scope, documentation, presentation and viva preparation).

SCOPE
- Answer only questions about this project and its documented technical topics, including explaining the general engineering concepts this project uses, improvement ideas for it, and presentation/viva/judge-question preparation.
- If the question is unrelated to this project (general knowledge, entertainment, personal, politics, sports, movies, news, unrelated coding, or anything else), reply with exactly this text and nothing else:
${OFF_TOPIC_REPLY}
- Never use or mention information about any other project.

ACCURACY
- Use only the PROJECT DETAILS and DOCUMENT EXCERPTS given in the input as the source of project facts. Never invent specifications, component values, sensor readings, pin connections, test results or implementation details.
- Never claim something is implemented unless the sources say so. Clearly separate what is implemented, what is in progress, and what is proposed/future work. Items under "Unverified observations" are not confirmed facts; say so if you use them.
- If the sources do not contain the answer, reply with exactly this text (you may add one short line on what related information IS documented):
${NOT_DOCUMENTED_REPLY}
- General engineering background (e.g. how an MQTT broker or a gas sensor works in general) may be explained, but label it as general background, not as a project fact.
- For improvement suggestions, label them clearly as suggestions, not as the existing implementation.
- If the question is ambiguous, ask one short clarification question instead of guessing.
- Mention the supporting document name (and page/section when visible in the excerpt) for project facts, e.g. "(Source: <document name>)".
${
  documentsLocked
    ? `- This visitor has NOT unlocked the project's documents (onboarding quiz + email verification). You only have the public project details. When a question needs document content, say that the detailed documents become available to the assistant after unlocking the Project Files, then answer only from the public details.`
    : hasDocuments
      ? ""
      : `- No document text is available for this project; rely only on the project details.`
}

FORMAT
- Professional, clear Markdown. Match the depth the user asks for (simple English for beginners, detailed engineering explanation when asked, step-by-step when asked).
- For substantial technical questions you may use these headings when helpful: 1. Direct Answer, 2. Detailed Explanation, 3. How It Works in This Project, 4. Practical Example, 5. Important Technical Points. Do not force this structure on short or simple questions.
- Keep follow-up questions in the context of this same project.`;
}

export const askAssistant = createServerFn({ method: "POST" })
  .inputValidator((d) => inputSchema.parse(d))
  .handler(async ({ data }): Promise<AssistantReply> => {
    const project = getProject(data.projectId);
    if (!project) return { ok: false, error: "This project doesn't exist." };

    const { GatewayError, PaymentRequiredError, RateLimitError, generateResponse } = await import("@lovable.dev/ai-gateway");
    const { ensureProjectIndex, retrieve } = await import("./knowledge.server");
    const { getAccessSession, hasFileAccess } = await import("@/lib/access/access.server");

    // Locked documents are used only for visitors who passed this project's quiz + email code.
    const protectedProject = project.quiz.length > 0;
    const unlocked = !protectedProject || hasFileAccess(await getAccessSession(project.id));
    const documentsLocked = protectedProject && !unlocked && project.documents.length > 0;

    try {
      let excerpts: Awaited<ReturnType<typeof retrieve>> = [];
      let missingNames: string[] = [];
      if (unlocked && project.documents.length > 0) {
        const { indexed, missing } = await ensureProjectIndex(project);
        missingNames = project.documents.filter((d) => missing.includes(d.id)).map((d) => d.name);
        const lastUser = [...data.history].reverse().find((t) => t.role === "user")?.content ?? "";
        const query = lastUser ? `${data.question}\n\nPrevious question: ${lastUser.slice(0, 500)}` : data.question;
        excerpts = await retrieve(project.id, indexed, query, 8);
      }

      const context = [
        `PROJECT DETAILS (from the website):\n${projectDetailsText(project, unlocked)}`,
        excerpts.length
          ? `DOCUMENT EXCERPTS (most relevant first):\n${excerpts
              .map((c) => `--- [${c.docName}, excerpt ${c.chunkIndex + 1}] ---\n${c.content}`)
              .join("\n\n")}`
          : documentsLocked
            ? "DOCUMENT EXCERPTS: none (documents are locked for this visitor)."
            : "DOCUMENT EXCERPTS: none found.",
        missingNames.length
          ? `Listed documents whose text is not available to you (not uploaded yet): ${missingNames.join("; ")}`
          : "",
      ]
        .filter(Boolean)
        .join("\n\n");

      const res = await generateResponse({
        model: "openai/gpt-6-astra",
        instructions: instructions(project.name, documentsLocked, excerpts.length > 0),
        input: [
          ...data.history.map((t) => ({ role: t.role, content: t.content })),
          { role: "user" as const, content: `${context}\n\n=== QUESTION ===\n${data.question}` },
        ],
      });

      const answer = res.output
        .flatMap((o) => (o.type === "message" ? o.content : []))
        .map((c) => (c.type === "output_text" ? c.text : ""))
        .join("")
        .trim();
      if (!answer) return { ok: false, error: "The assistant returned an empty answer. Please try again." };

      const sources = [...new Set(excerpts.map((c) => c.docName))].filter((n) => answer.includes(n));
      return { ok: true, answer, sources, documentsLocked };
    } catch (e) {
      console.error("[assistant] failed", e);
      if (e instanceof PaymentRequiredError) return { ok: false, error: "The AI service is out of credits. Please ask the project owner to add credits." };
      if (e instanceof RateLimitError) return { ok: false, error: "The AI service is busy. Please wait a moment and try again." };
      if (e instanceof GatewayError) return { ok: false, error: "The AI service couldn't answer right now. Please try again." };
      return { ok: false, error: "Something went wrong while preparing the answer. Please try again." };
    }
  });
