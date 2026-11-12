import { Link, useNavigate } from "@tanstack/react-router";
import { ChevronDown, LogOut, Settings } from "lucide-react";

import { UserAvatar } from "@/components/common/UserAvatar";
import { DemoBadge } from "@/components/common/DemoBadge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/lib/auth/auth-context";

export function UserMenu() {
  const { session, mode, signOut } = useAuth();
  const navigate = useNavigate();
  if (!session) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2 rounded-xl p-1 pr-2 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <UserAvatar name={session.user.name} className="size-9" />
        <span className="hidden text-left lg:block">
          <span className="block max-w-36 truncate text-sm font-bold text-foreground">{session.user.name}</span>
          <span className="block max-w-36 truncate text-xs text-muted-foreground">{session.user.email}</span>
        </span>
        <ChevronDown className="hidden size-4 text-muted-foreground lg:block" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60 rounded-2xl p-1.5">
        <DropdownMenuLabel className="space-y-1.5">
          <p className="truncate text-sm font-bold">{session.user.name}</p>
          <p className="truncate text-xs font-normal text-muted-foreground">{session.user.email}</p>
          {mode === "demo" && <DemoBadge />}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className="rounded-lg">
          <Link to="/settings">
            <Settings /> Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem
          className="rounded-lg text-destructive focus:text-destructive"
          onSelect={async () => {
            await signOut();
            navigate({ to: "/" });
          }}
        >
          <LogOut /> Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
