import { useNavigate } from "@tanstack/react-router";
import { LogOut } from "lucide-react";

import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useAuth } from "@/lib/auth/auth-context";
import { GlobalSearch } from "./GlobalSearch";
import { NotificationsMenu } from "./NotificationsMenu";
import { UserMenu } from "./UserMenu";

export function TopBar() {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b bg-card/85 px-3 backdrop-blur-md sm:gap-4 sm:px-5">
      <SidebarTrigger className="rounded-xl" />
      <div className="hidden sm:block">
        <Logo />
      </div>
      <div className="sm:hidden">
        <Logo compact />
      </div>
      <div className="flex flex-1 justify-center px-1">
        <GlobalSearch />
      </div>
      <NotificationsMenu />
      <UserMenu />
      <Button
        variant="ghost"
        size="icon"
        className="rounded-xl text-muted-foreground hover:text-destructive"
        aria-label="Log out"
        title="Log out"
        onClick={async () => {
          await signOut();
          navigate({ to: "/" });
        }}
      >
        <LogOut className="size-5" />
      </Button>
    </header>
  );
}
