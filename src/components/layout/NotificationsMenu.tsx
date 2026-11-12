import { Link } from "@tanstack/react-router";
import { Bell } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { notifications } from "@/data/projects";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

export function NotificationsMenu() {
  const [read, setRead] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState(false);
  const unread = notifications.filter((n) => !read.has(n.id)).length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative rounded-xl" aria-label={`Notifications (${unread} unread)`}>
          <Bell className="size-5" />
          {unread > 0 && (
            <span className="absolute right-1.5 top-1.5 grid size-4 place-items-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
              {unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[22rem] rounded-2xl p-0 shadow-elevated">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <p className="text-sm font-bold">Notifications</p>
          <button
            type="button"
            className="text-xs font-semibold text-primary disabled:text-muted-foreground"
            disabled={unread === 0}
            onClick={() => setRead(new Set(notifications.map((n) => n.id)))}
          >
            Mark all as read
          </button>
        </div>
        {notifications.length === 0 && (
          <p className="px-4 py-6 text-center text-sm text-muted-foreground">No notifications yet.</p>
        )}
        <ul className="max-h-80 divide-y overflow-y-auto">
          {notifications.map((n) => {
            const isUnread = !read.has(n.id);
            const body = (
              <div className="flex gap-3 px-4 py-3 transition-colors hover:bg-muted">
                <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", isUnread ? "bg-primary" : "bg-transparent")} />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">{n.title}</p>
                  <p className="text-xs text-muted-foreground">{n.body}</p>
                  <p className="mt-1 text-[11px] font-medium text-muted-foreground">{formatDateTime(n.at)}</p>
                </div>
              </div>
            );
            return (
              <li key={n.id}>
                {n.projectId ? (
                  <Link
                    to="/projects/$projectId"
                    params={{ projectId: n.projectId }}
                    onClick={() => {
                      setRead((r) => new Set(r).add(n.id));
                      setOpen(false);
                    }}
                  >
                    {body}
                  </Link>
                ) : (
                  body
                )}
              </li>
            );
          })}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
