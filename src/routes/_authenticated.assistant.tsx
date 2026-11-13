import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { Bot, FileSearch, ListChecks, Loader2, Lock, MessageSquareText, RotateCcw, SendHorizontal } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { z } from "zod";

import { PageHeader } from "@/components/common/PageHeader";
import { SectionCard } from "@/components/common/SectionCard";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getProject, projects } from "@/data/projects";
import { accessStatusQuery } from "@/lib/access/access-queries";
import { askAssistant } from "@/lib/assistant/assistant-client";
import { MAX_HISTORY_MESSAGES, MAX_QUESTION_CHARS, type ChatTurn } from "@/lib/assistant/policy";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/assistant")({
  validateSearch: z.object({ project: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "AI Assistant — HandoverPulse" },
      { name: "description", content: "Ask the HandoverPulse AI Assistant about a project's architecture, hardware, software and documents." },
      { property: "og:title", content: "AI Assistant — HandoverPulse" },
      { property: "og:description", content: "Project-specific answers grounded in each project's own documents." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AssistantPage,
});

const planned = [
  { icon: MessageSquareText, title: "Ask about any project", body: "“Why did Trans-Shield switch from HTTP to MQTT?”" },
  { icon: FileSearch, title: "Answers with sources", body: "Every answer links to the handover documents it used." },
  { icon: ListChecks, title: "Handover summaries", body: "Generate a takeover brief with risks and next steps." },
];

const examples = [
  "Explain the complete system architecture.",
  "What is the purpose of the ESP32 in this system?",
  "What happens when a sensor detects a dangerous condition?",
  "What questions might judges ask about this project?",
];

type Message = ChatTurn & { sources?: string[]; error?: boolean };

const storageKey = (projectId: string) => `hp-assistant-chat-${projectId}`;

function AssistantPage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const projectId = getProject(search.project ?? "")?.id ?? projects[0]!.id;
  const project = getProject(projectId)!;
  const ask = askAssistant;

  const isProtected = project.quiz.length > 0 && project.documents.length > 0;
  const access = useQuery({ ...accessStatusQuery(project.id), enabled: isProtected });
  const unlocked = !isProtected || !!access.data?.emailVerified;

  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  // Conversation history lives in this browser tab's session, one thread per project.
  useEffect(() => {
    try {
      const saved = window.sessionStorage.getItem(storageKey(projectId));
      setMessages(saved ? (JSON.parse(saved) as Message[]) : []);
    } catch {
      setMessages([]);
    }
  }, [projectId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages, pending]);

  function save(next: Message[]) {
    setMessages(next);
    try {
      window.sessionStorage.setItem(storageKey(projectId), JSON.stringify(next));
    } catch {
      /* storage full or blocked: the chat still works for this view */
    }
  }

  async function send(question: string) {
    const q = question.trim();
    if (!q || pending) return;
    const history: ChatTurn[] = messages
      .filter((m) => !m.error)
      .slice(-MAX_HISTORY_MESSAGES)
      .map(({ role, content }) => ({ role, content }));
    const withQuestion: Message[] = [...messages, { role: "user", content: q }];
    save(withQuestion);
    setDraft("");
    setPending(true);
    try {
      const res = await ask({ data: { projectId, question: q, history } });
      save([
        ...withQuestion,
        res.ok
          ? { role: "assistant", content: res.answer, sources: res.sources }
          : { role: "assistant", content: res.error, error: true },
      ]);
    } catch {
      save([...withQuestion, { role: "assistant", content: "The assistant couldn't be reached. Please try again.", error: true }]);
    } finally {
      setPending(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void send(draft);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Assistant"
        description="Ask questions about your projects' history, decisions and documents."
        eyebrow={
          <span className="inline-flex rounded-full bg-lavender-soft px-2.5 py-1 text-xs font-bold text-accent-foreground">
            Project-only answers
          </span>
        }
        actions={
          <Select value={projectId} onValueChange={(v) => navigate({ search: { project: v } })}>
            <SelectTrigger className="h-10 w-full min-w-56 rounded-xl bg-card sm:w-72" aria-label="Project">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.shortName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      <SectionCard className="flex min-h-[22rem] flex-col">
        {isProtected && !unlocked && (
          <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl bg-primary-soft px-3 py-2 text-xs font-medium text-secondary-foreground">
            <Lock className="size-3.5" />
            <span>Answers use only the public project details until you unlock this project's files.</span>
            <Link to="/projects/$projectId/quiz" params={{ projectId }} className="font-bold text-primary hover:underline">
              Unlock files
            </Link>
          </div>
        )}

        {messages.length === 0 && !pending ? (
          <div className="flex flex-1 flex-col items-center justify-center py-8 text-center">
            <span className="grid size-14 place-items-center rounded-2xl bg-gradient-primary text-primary-foreground shadow-glow">
              <Bot className="size-7" />
            </span>
            <p className="mt-4 text-lg font-bold">Ask about {project.shortName}</p>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">
              Answers come only from this project's details{project.documents.length > 0 ? " and documents" : ""}. Questions about
              anything else are declined.
            </p>
            <div className="mt-5 flex max-w-xl flex-wrap justify-center gap-2">
              {examples.map((ex) => (
                <button
                  key={ex}
                  type="button"
                  onClick={() => void send(ex)}
                  className="rounded-full border bg-background px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="mb-4 flex max-h-[60vh] flex-1 flex-col gap-4 overflow-y-auto pr-1" aria-live="polite">
            {messages.map((m, i) => (
              <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[92%] rounded-2xl px-4 py-3 text-sm sm:max-w-[80%]",
                    m.role === "user"
                      ? "bg-gradient-primary text-primary-foreground"
                      : m.error
                        ? "bg-destructive-soft font-medium text-destructive"
                        : "border bg-background text-foreground",
                  )}
                >
                  {m.role === "assistant" && !m.error ? (
                    <div className="assistant-md space-y-2 leading-relaxed [&_h1]:text-base [&_h1]:font-bold [&_h2]:text-base [&_h2]:font-bold [&_h3]:font-bold [&_li]:ml-4 [&_ol]:list-decimal [&_ol]:space-y-1 [&_strong]:font-bold [&_table]:w-full [&_table]:text-xs [&_td]:border [&_td]:px-2 [&_td]:py-1 [&_th]:border [&_th]:px-2 [&_th]:py-1 [&_ul]:list-disc [&_ul]:space-y-1 [&_code]:rounded [&_code]:bg-muted [&_code]:px-1">
                      <Markdown remarkPlugins={[remarkGfm]}>{m.content}</Markdown>
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap">{m.content}</p>
                  )}
                  {m.sources && m.sources.length > 0 && (
                    <p className="mt-2 flex flex-wrap items-center gap-1.5 border-t pt-2 text-xs text-muted-foreground">
                      <FileSearch className="size-3.5" /> Sources: {m.sources.join(" · ")}
                    </p>
                  )}
                </div>
              </div>
            ))}
            {pending && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" /> Reading the project sources…
              </div>
            )}
            <div ref={endRef} />
          </div>
        )}

        <form onSubmit={onSubmit} className="relative">
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={MAX_QUESTION_CHARS}
            placeholder={`Ask about ${project.shortName}…`}
            aria-label="Your question"
            disabled={pending}
            className="h-12 rounded-xl bg-background pr-12"
          />
          <button
            type="submit"
            aria-label="Send question"
            disabled={pending || !draft.trim()}
            className="absolute right-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-lg text-primary transition-colors hover:bg-primary-soft disabled:text-muted-foreground disabled:hover:bg-transparent"
          >
            {pending ? <Loader2 className="size-4 animate-spin" /> : <SendHorizontal className="size-4" />}
          </button>
        </form>
        {messages.length > 0 && (
          <button
            type="button"
            onClick={() => save([])}
            disabled={pending}
            className="mt-3 inline-flex items-center gap-1.5 self-start text-xs font-semibold text-muted-foreground hover:text-foreground disabled:opacity-50"
          >
            <RotateCcw className="size-3.5" /> New conversation
          </button>
        )}
      </SectionCard>

      <div className="grid gap-4 md:grid-cols-3">
        {planned.map((p, i) => (
          <div key={p.title} className="surface-card animate-fade-up p-5" style={{ animationDelay: `${i * 60}ms` }}>
            <span className="grid size-9 place-items-center rounded-xl bg-primary-soft text-primary">
              <p.icon className="size-4" />
            </span>
            <p className="mt-3 font-bold text-foreground">{p.title}</p>
            <p className="mt-1 text-sm text-muted-foreground">{p.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
