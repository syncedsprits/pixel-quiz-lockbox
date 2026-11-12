import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Github, KeyRound, LogOut, MessageSquare, Trello } from "lucide-react";
import { useState } from "react";
import type { FormEvent } from "react";
import { toast } from "sonner";

import { DemoBadge } from "@/components/common/DemoBadge";
import { PageHeader } from "@/components/common/PageHeader";
import { SectionCard } from "@/components/common/SectionCard";
import { UserAvatar } from "@/components/common/UserAvatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/lib/auth/auth-context";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Settings — HandoverPulse" },
      { name: "description", content: "Manage your HandoverPulse profile, notifications and account." },
      { property: "og:title", content: "Settings — HandoverPulse" },
      { property: "og:description", content: "Manage your HandoverPulse profile, notifications and account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SettingsPage,
});

const integrations = [
  { name: "GitHub", icon: Github, body: "Link repositories to project folders." },
  { name: "Slack", icon: MessageSquare, body: "Capture decisions from project channels." },
  { name: "Jira", icon: Trello, body: "Sync open tickets into pending tasks." },
];

function SettingsPage() {
  const { session, mode, signOut } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState(session?.user.name ?? "");
  const [prefs, setPrefs] = useState({ handover: true, milestones: true, digest: false });

  function saveProfile(e: FormEvent) {
    e.preventDefault();
    toast.success("Profile saved", {
      description: mode === "demo" ? "Demo Mode keeps changes for this visit only." : undefined,
    });
  }

  if (!session) return null;

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Your profile, notifications and account." />

      <div className="grid gap-6 lg:grid-cols-3">
        <SectionCard title="Profile" className="lg:col-span-2">
          <form onSubmit={saveProfile} className="space-y-5">
            <div className="flex items-center gap-4">
              <UserAvatar name={name || session.user.name} className="size-14 text-base" />
              <div>
                <p className="font-bold text-foreground">{name || session.user.name}</p>
                <p className="text-sm text-muted-foreground">{session.user.email}</p>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Display name</Label>
                <Input id="name" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} className="h-11 rounded-xl bg-background" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" value={session.user.email} disabled className="h-11 rounded-xl bg-muted" />
              </div>
            </div>
            <Button type="submit" variant="hero">
              Save changes
            </Button>
          </form>
        </SectionCard>

        <SectionCard title="Account">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <KeyRound className="size-4 text-muted-foreground" /> Sign-in method
              </span>
              {mode === "demo" ? <DemoBadge /> : <span className="text-sm font-semibold">Secure sign-in</span>}
            </div>
            {mode === "demo" && (
              <p className="text-xs leading-relaxed text-muted-foreground">
                Demo sessions are stored only in this browser. Uploaded project files are also kept in this browser only.
              </p>
            )}
            <Button
              variant="outline"
              className="w-full text-destructive hover:text-destructive"
              onClick={async () => {
                await signOut();
                navigate({ to: "/" });
              }}
            >
              <LogOut /> Log out
            </Button>
          </div>
        </SectionCard>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title="Notifications">
          <ul className="space-y-4">
            {(
              [
                ["handover", "Handover updates", "When a project you follow enters or completes handover."],
                ["milestones", "Milestone reminders", "Three days before a milestone is due."],
                ["digest", "Weekly digest", "A Monday summary of every project you own."],
              ] as const
            ).map(([key, title, body]) => (
              <li key={key} className="flex items-start justify-between gap-4">
                <Label htmlFor={key} className="cursor-pointer">
                  <span className="block text-sm font-semibold text-foreground">{title}</span>
                  <span className="mt-0.5 block text-xs font-normal text-muted-foreground">{body}</span>
                </Label>
                <Switch id={key} checked={prefs[key]} onCheckedChange={(v) => setPrefs((p) => ({ ...p, [key]: v }))} />
              </li>
            ))}
          </ul>
        </SectionCard>

        <SectionCard title="Integrations">
          <ul className="space-y-3">
            {integrations.map((i) => (
              <li key={i.name} className="flex items-center gap-3 rounded-xl border bg-background p-3">
                <span className="grid size-9 place-items-center rounded-xl bg-muted text-foreground">
                  <i.icon className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground">{i.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{i.body}</p>
                </div>
                <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-bold text-muted-foreground">Not connected</span>
              </li>
            ))}
          </ul>
        </SectionCard>
      </div>
    </div>
  );
}
