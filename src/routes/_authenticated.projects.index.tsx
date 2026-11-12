import { createFileRoute } from "@tanstack/react-router";
import { FolderSearch, Search } from "lucide-react";
import { useMemo, useState } from "react";

import { PageHeader } from "@/components/common/PageHeader";
import { ProjectCard } from "@/components/projects/ProjectCard";
import { statusMeta } from "@/components/projects/StatusBadge";
import { Input } from "@/components/ui/input";
import { projects } from "@/data/projects";
import type { ProjectStatus } from "@/data/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/projects/")({
  head: () => ({
    meta: [
      { title: "Projects — HandoverPulse" },
      { name: "description", content: "Browse project folders, leads, status and handover progress." },
      { property: "og:title", content: "Projects — HandoverPulse" },
      { property: "og:description", content: "Browse project folders, leads, status and handover progress." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ProjectsPage,
});

type Filter = "all" | ProjectStatus;

function ProjectsPage() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return projects.filter(
      (p) =>
        (filter === "all" || p.status === filter) &&
        (!q ||
          p.name.toLowerCase().includes(q) ||
          (p.lead?.name.toLowerCase().includes(q) ?? false) ||
          p.description.toLowerCase().includes(q)),
    );
  }, [query, filter]);

  const filters: { value: Filter; label: string }[] = [
    { value: "all", label: "All" },
    ...(Object.keys(statusMeta) as ProjectStatus[]).map((s) => ({ value: s, label: statusMeta[s].label })),
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Projects" description="Every project folder with its lead, status and latest activity." />

      <div className="flex animate-fade-up flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="relative w-full md:max-w-sm">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter by name, lead or description"
            className="h-10 rounded-xl bg-card pl-10"
            aria-label="Filter projects"
          />
        </div>
        <div className="flex flex-wrap gap-1.5 rounded-2xl bg-card p-1 shadow-soft" role="tablist">
          {filters.map((f) => (
            <button
              key={f.value}
              type="button"
              role="tab"
              aria-selected={filter === f.value}
              onClick={() => setFilter(f.value)}
              className={cn(
                "rounded-xl px-3 py-1.5 text-xs font-bold transition-colors",
                filter === f.value ? "bg-primary text-primary-foreground shadow-soft" : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length ? (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((p, i) => (
            <ProjectCard key={p.id} project={p} index={i} />
          ))}
        </div>
      ) : (
        <div className="surface-card flex flex-col items-center px-6 py-16 text-center">
          <FolderSearch className="size-10 text-muted-foreground" />
          <p className="mt-3 font-bold">No projects match your filters</p>
          <button
            type="button"
            className="mt-2 text-sm font-semibold text-primary"
            onClick={() => {
              setQuery("");
              setFilter("all");
            }}
          >
            Clear filters
          </button>
        </div>
      )}
    </div>
  );
}
