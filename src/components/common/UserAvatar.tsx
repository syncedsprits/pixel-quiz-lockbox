import { initials } from "@/lib/format";
import { cn } from "@/lib/utils";

const tones = [
  "bg-primary-soft text-secondary-foreground",
  "bg-lavender-soft text-accent-foreground",
  "bg-success-soft text-success",
  "bg-warning-soft text-warning",
];

export function UserAvatar({ name, className }: { name: string; className?: string }) {
  const tone = tones[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % tones.length];
  return (
    <span
      title={name}
      className={cn(
        "grid size-8 shrink-0 place-items-center rounded-full text-xs font-bold ring-2 ring-card",
        tone,
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}
