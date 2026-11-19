import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeftRight, Check, Clock, Loader2, ShieldQuestion, UserCog, UserRound, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import type { Project } from "@/data/types";
import { decideApproval, listApprovalRequests, requestApproval } from "@/lib/access/access-client";
import { accessStatusQuery } from "@/lib/access/access-queries";
import type { ApprovalStatus } from "@/lib/access/access-schemas";

type View = "new" | "switch" | "old";

/**
 * Demo role switch shown after the email code is verified. Picking "Old Admin" is a demo step,
 * not identity proof. Files and the assistant stay locked on the server until a request is approved.
 */
export function OldAdminApproval({ project, approvalStatus }: { project: Project; approvalStatus: ApprovalStatus }) {
  const queryClient = useQueryClient();
  const [view, setView] = useState<View>("new");
  const [busy, setBusy] = useState<string | null>(null);

  const requests = useQuery({
    queryKey: ["approval-requests", project.id],
    queryFn: () => listApprovalRequests({ data: { projectId: project.id } }),
    enabled: view === "old",
    staleTime: 0,
  });

  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: accessStatusQuery(project.id).queryKey }),
      queryClient.invalidateQueries({ queryKey: ["approval-requests", project.id] }),
    ]);

  async function ask() {
    setBusy("ask");
    try {
      const res = await requestApproval({ data: { projectId: project.id } });
      if (!res.ok) return void toast.error(res.error);
      await refresh();
      setView("switch");
    } catch {
      toast.error("Your request couldn't be sent. Please try again.");
    } finally {
      setBusy(null);
    }
  }

  async function decide(requestId: string, decision: "approve" | "decline") {
    setBusy(requestId);
    try {
      const res = await decideApproval({ data: { projectId: project.id, requestId, decision } });
      if (!res.ok) {
        toast.error(res.error);
        await refresh();
        return;
      }
      setView("new");
      await refresh();
      if (decision === "approve") toast.success("Access approved", { description: "Switched back to New Admin." });
      else toast.error("Access request declined", { description: "Switched back to New Admin." });
    } catch {
      toast.error("The decision couldn't be saved. Please try again.");
    } finally {
      setBusy(null);
    }
  }

  if (view === "switch") {
    return (
      <div className="rounded-xl border bg-background p-5">
        <p className="flex items-center gap-2 text-sm font-bold text-foreground">
          <ArrowLeftRight className="size-4 text-primary" /> Switch User
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          New Admin must switch to Old Admin to review the access request. This is a demo role switch, not identity verification.
        </p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <Button variant="hero" onClick={() => setView("old")}>
            <UserCog /> Old Admin
          </Button>
          <Button variant="soft" onClick={() => setView("new")}>
            <UserRound /> New Admin (you)
          </Button>
        </div>
      </div>
    );
  }

  if (view === "old") {
    const list = requests.data ?? [];
    return (
      <div className="rounded-xl border bg-background p-5">
        <div className="flex items-center justify-between gap-2">
          <p className="flex items-center gap-2 text-sm font-bold text-foreground">
            <UserCog className="size-4 text-primary" /> Old Admin
          </p>
          <Button size="sm" variant="ghost" onClick={() => setView("switch")}>
            <ArrowLeftRight /> Switch User
          </Button>
        </div>
        {requests.isPending ? (
          <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Loading requests…
          </p>
        ) : requests.isError ? (
          <p className="mt-4 rounded-xl bg-destructive-soft px-3 py-2 text-sm font-medium text-destructive">
            Requests couldn't be loaded. Please try again.
          </p>
        ) : list.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">There are no pending access requests for this project.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {list.map((r) => (
              <li key={r.id} className="rounded-xl border p-4">
                <p className="text-sm font-semibold text-foreground">Someone asked you to access this project.</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {[r.maskedEmail, r.role, r.fromYou ? "this session" : null].filter(Boolean).join(" · ")}
                </p>
                <div className="mt-3 flex gap-2">
                  <Button size="sm" variant="hero" disabled={busy !== null} onClick={() => void decide(r.id, "approve")}>
                    {busy === r.id ? <Loader2 className="animate-spin" /> : <Check />} Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="soft"
                    className="text-destructive hover:text-destructive"
                    disabled={busy !== null}
                    onClick={() => void decide(r.id, "decline")}
                  >
                    <X /> Decline
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start gap-4 rounded-xl border bg-background p-5 sm:flex-row sm:items-center">
      <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-gradient-panel text-primary">
        <ShieldQuestion className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-foreground">Ask Permission to Old Admin</p>
        {approvalStatus === "declined" ? (
          <p className="mt-1 text-sm font-medium text-destructive">
            Old Admin declined your access request. Project files and the AI Assistant stay locked.
          </p>
        ) : approvalStatus === "pending" ? (
          <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
            <Clock className="size-3.5" /> Your request is waiting for Old Admin. Files and the AI Assistant stay locked until it's approved.
          </p>
        ) : (
          <p className="mt-1 text-sm text-muted-foreground">
            Your email is verified. Old Admin must approve your request before the files and AI Assistant open.
          </p>
        )}
      </div>
      <Button
        variant="hero"
        size="sm"
        className="shrink-0"
        disabled={busy !== null}
        onClick={() => (approvalStatus === "pending" ? setView("switch") : void ask())}
      >
        {busy === "ask" ? <Loader2 className="animate-spin" /> : <ArrowLeftRight />}
        {approvalStatus === "pending" ? "Switch User" : "Ask Permission to Old Admin"}
      </Button>
    </div>
  );
}
