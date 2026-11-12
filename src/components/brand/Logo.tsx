import { Link } from "@tanstack/react-router";

import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "grid size-9 shrink-0 place-items-center rounded-xl bg-gradient-primary text-primary-foreground shadow-glow",
        className,
      )}
      aria-hidden
    >
      <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 12h4l2-5 4 10 2-5h6" />
      </svg>
    </span>
  );
}

export function Logo({ to = "/dashboard", compact = false }: { to?: "/dashboard" | "/"; compact?: boolean }) {
  return (
    <Link to={to} className="flex items-center gap-2.5" aria-label="HandoverPulse home">
      <LogoMark />
      {!compact && (
        <span className="text-[1.05rem] font-extrabold tracking-tight text-foreground">
          Handover<span className="text-primary">Pulse</span>
        </span>
      )}
    </Link>
  );
}
