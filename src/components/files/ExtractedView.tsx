import { useMemo, useState } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Conversation } from "@/lib/files/chat-parsers";
import type { Extracted } from "@/lib/files/extracted";
import { formatBytes } from "@/lib/files/formats";
import { sanitizeHtml } from "@/lib/files/sanitize-html";
import { cn } from "@/lib/utils";
import { PackageSummary } from "./PackageSummary";

const MAX_MESSAGES = 300;

function Notice({ children, tone = "muted" }: { children: React.ReactNode; tone?: "muted" | "warning" }) {
  return (
    <p className={cn("rounded-xl px-3 py-2.5 text-sm", tone === "warning" ? "bg-warning-soft text-warning" : "bg-muted text-muted-foreground")}>
      {children}
    </p>
  );
}

function ChatView({ conversations, errors, source }: { conversations: Conversation[]; errors: string[]; source: string }) {
  const [open, setOpen] = useState(0);
  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold text-muted-foreground">
        {source === "whatsapp" ? "WhatsApp chat export" : "ChatGPT export"} · {conversations.length} conversation
        {conversations.length === 1 ? "" : "s"}
      </p>
      {errors.length > 0 && (
        <Notice tone="warning">
          {errors.length} part{errors.length === 1 ? "" : "s"} couldn't be read: {errors.slice(0, 3).join(" · ")}
          {errors.length > 3 ? " …" : ""}
        </Notice>
      )}
      <ul className="space-y-2">
        {conversations.map((c, i) => (
          <li key={i} className="rounded-xl border bg-background">
            <button
              type="button"
              className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left"
              onClick={() => setOpen(open === i ? -1 : i)}
              aria-expanded={open === i}
            >
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-foreground">{c.title ?? `Conversation ${i + 1}`}</span>
                <span className="block text-xs text-muted-foreground">
                  {c.messages.length} messages{c.createdAt ? ` · ${new Date(c.createdAt).toLocaleString()}` : ""}
                </span>
              </span>
              <span className="text-xs font-bold text-primary">{open === i ? "Hide" : "Show"}</span>
            </button>
            {open === i && (
              <ol className="max-h-96 space-y-2 overflow-y-auto border-t px-3 py-3">
                {c.messages.slice(0, MAX_MESSAGES).map((m, j) => (
                  <li key={j} className="text-sm">
                    <span className="font-bold text-foreground">{m.sender}</span>
                    {m.at && <span className="ml-2 text-[11px] text-muted-foreground">{m.at.includes("T") ? new Date(m.at).toLocaleString() : m.at}</span>}
                    <p className="whitespace-pre-wrap text-muted-foreground">{m.text}</p>
                  </li>
                ))}
                {c.messages.length > MAX_MESSAGES && (
                  <li className="text-xs text-muted-foreground">Showing the first {MAX_MESSAGES} of {c.messages.length} messages.</li>
                )}
              </ol>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ExtractedView({ extracted, fileName }: { extracted: Extracted; fileName: string }) {
  const html = useMemo(() => (extracted.kind === "html" ? sanitizeHtml(extracted.html) : ""), [extracted]);
  const [sheet, setSheet] = useState(0);

  switch (extracted.kind) {
    case "text":
      if (extracted.format === "markdown") {
        return (
          <div className="doc-preview">
            <Markdown remarkPlugins={[remarkGfm]}>{extracted.text}</Markdown>
          </div>
        );
      }
      return (
        <pre className={cn("whitespace-pre-wrap break-words rounded-xl bg-muted p-4 text-sm text-foreground", extracted.format === "json" && "font-mono text-xs")}>
          {extracted.text}
        </pre>
      );
    case "html":
      return (
        <div className="space-y-3">
          {/* Sanitised at extraction and again here: only formatting tags and http(s) links remain. */}
          <div className="doc-preview" dangerouslySetInnerHTML={{ __html: html }} />
        </div>
      );
    case "pages":
      return (
        <div className="space-y-4">
          {extracted.pages.map((p, i) => (
            <section key={i}>
              <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">Page {i + 1}</p>
              <pre className="whitespace-pre-wrap break-words rounded-xl bg-muted p-4 text-sm text-foreground">{p || "(No text on this page)"}</pre>
            </section>
          ))}
        </div>
      );
    case "sheets": {
      const current = extracted.sheets[sheet] ?? extracted.sheets[0];
      if (!current) return <Notice>No sheets found.</Notice>;
      const [head, ...rows] = current.rows;
      return (
        <div className="space-y-3">
          {extracted.sheets.length > 1 && (
            <div className="flex flex-wrap gap-1.5">
              {extracted.sheets.map((s, i) => (
                <button
                  key={s.name}
                  type="button"
                  onClick={() => setSheet(i)}
                  className={cn(
                    "rounded-xl px-3 py-1.5 text-xs font-bold transition-colors",
                    i === sheet ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground",
                  )}
                >
                  {s.name}
                </button>
              ))}
            </div>
          )}
          <div className="max-h-[55vh] overflow-auto rounded-xl border">
            <Table>
              {head && (
                <TableHeader>
                  <TableRow>
                    {head.map((c, i) => (
                      <TableHead key={i}>{c}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
              )}
              <TableBody>
                {rows.map((r, i) => (
                  <TableRow key={i}>
                    {r.map((c, j) => (
                      <TableCell key={j}>{c}</TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {current.truncated && <Notice>Showing the first rows only.</Notice>}
        </div>
      );
    }
    case "slides":
      return (
        <ol className="space-y-3">
          {extracted.slides.map((s) => (
            <li key={s.index} className="rounded-xl border bg-background p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Slide {s.index}</p>
              {s.paragraphs.length ? (
                <ul className="mt-2 space-y-1 text-sm text-foreground">
                  {s.paragraphs.map((p, i) => (
                    <li key={i}>{p}</li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">(No text on this slide)</p>
              )}
            </li>
          ))}
        </ol>
      );
    case "chat":
      return <ChatView conversations={extracted.conversations} errors={extracted.errors} source={extracted.source} />;
    case "archive":
      return (
        <div className="space-y-4">
          {extracted.chat && (
            <ChatView conversations={extracted.chat.conversations} errors={extracted.chat.errors} source="chatgpt" />
          )}
          <Notice>Archive contents are listed only — nothing inside the archive is opened or run.</Notice>
          <div className="max-h-72 overflow-auto rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>File</TableHead>
                  <TableHead className="text-right">Size</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {extracted.entries.map((e) => (
                  <TableRow key={e.path}>
                    <TableCell className="break-all">{e.path}</TableCell>
                    <TableCell className="text-right">{formatBytes(e.size)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {extracted.skipped.length > 0 && (
            <div>
              <p className="mb-1.5 text-xs font-bold text-muted-foreground">Not processed ({extracted.skipped.length})</p>
              <ul className="max-h-40 space-y-1 overflow-y-auto text-xs text-muted-foreground">
                {extracted.skipped.map((s) => (
                  <li key={s.path}>
                    <span className="break-all font-semibold text-foreground">{s.path}</span> — {s.reason}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      );
    case "package":
      return <PackageSummary data={extracted.data} fileName={fileName} />;
    case "image":
      return <Notice>{extracted.note}</Notice>;
    case "none":
      return <Notice>{extracted.reason}</Notice>;
  }
}
