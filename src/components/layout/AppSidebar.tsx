import { Link, useRouterState } from "@tanstack/react-router";
import { ArrowLeftRight, Bot, FolderKanban, LayoutDashboard, Settings } from "lucide-react";

import { DemoBadge } from "@/components/common/DemoBadge";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/lib/auth/auth-context";

export const navItems = [
  { title: "Dashboard", to: "/dashboard", icon: LayoutDashboard },
  { title: "Projects", to: "/projects", icon: FolderKanban },
  { title: "Export / Import", to: "/export-import", icon: ArrowLeftRight },
  { title: "AI Assistant", to: "/assistant", icon: Bot },
  { title: "Settings", to: "/settings", icon: Settings },
] as const;

export function AppSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { state, isMobile, setOpenMobile } = useSidebar();
  const { mode } = useAuth();
  const collapsed = state === "collapsed" && !isMobile;

  return (
    <Sidebar collapsible="icon" className="top-16! h-[calc(100svh-4rem)]! border-r border-sidebar-border">
      <SidebarContent className="pt-3">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {navItems.map((item) => {
                const active = pathname === item.to || pathname.startsWith(`${item.to}/`);
                return (
                  <SidebarMenuItem key={item.to}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      tooltip={item.title}
                      className="h-10 rounded-xl font-semibold data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-primary"
                    >
                      <Link to={item.to} onClick={() => isMobile && setOpenMobile(false)}>
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      {mode === "demo" && !collapsed && (
        <SidebarFooter className="p-3">
          <div className="rounded-2xl bg-gradient-panel p-4">
            <DemoBadge />
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              Demo sign-in: your session is kept in this browser only. Uploaded files also stay in this browser.
            </p>
          </div>
        </SidebarFooter>
      )}
    </Sidebar>
  );
}
