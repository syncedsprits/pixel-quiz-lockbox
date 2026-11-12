import { useNavigate } from "@tanstack/react-router";
import { FolderOpen, Search } from "lucide-react";
import { useEffect, useState } from "react";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { navItems } from "./AppSidebar";
import { projects } from "@/data/projects";

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-10 w-full max-w-md items-center gap-2.5 rounded-xl border border-input bg-background px-3 text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:bg-card"
        aria-label="Search projects and pages"
      >
        <Search className="size-4" />
        <span className="flex-1 truncate text-left">Search projects, pages…</span>
        <kbd className="hidden rounded-md border bg-card px-1.5 py-0.5 text-[10px] font-bold sm:inline">⌘K</kbd>
      </button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Search projects, leads or pages…" />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Projects">
            {projects.map((p) => (
              <CommandItem
                key={p.id}
                value={`${p.name} ${p.lead?.name ?? ""}`}
                onSelect={() => {
                  setOpen(false);
                  navigate({ to: "/projects/$projectId", params: { projectId: p.id } });
                }}
              >
                <FolderOpen />
                <span className="truncate">{p.shortName}</span>
                <span className="ml-auto text-xs text-muted-foreground">{p.lead?.name}</span>
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandGroup heading="Pages">
            {navItems.map((item) => (
              <CommandItem
                key={item.to}
                value={item.title}
                onSelect={() => {
                  setOpen(false);
                  navigate({ to: item.to });
                }}
              >
                <item.icon />
                <span>{item.title}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
