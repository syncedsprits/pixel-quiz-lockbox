import { ArrowUp, Sparkles, X } from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import { createPortal } from "react-dom";

import { Button } from "@/components/ui/button";

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const PAD = 10;
const TIP_WIDTH = 320;

/**
 * Dims the page, cuts a hole around `targetRef`, and points at it with an arrow + message.
 * Clicks inside the hole reach the real target; clicks on the dimmed area are blocked.
 */
export function Spotlight({
  targetRef,
  open,
  message,
  detail,
  primaryLabel,
  onPrimary,
  onDismiss,
}: {
  targetRef: RefObject<HTMLElement | null>;
  open: boolean;
  message: string;
  detail?: string;
  primaryLabel: string;
  onPrimary: () => void;
  onDismiss: () => void;
}) {
  const [rect, setRect] = useState<Rect | null>(null);
  const tipRef = useRef<HTMLDivElement>(null);

  const measure = useCallback(() => {
    const el = targetRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setRect({ top: r.top - PAD, left: r.left - PAD, width: r.width + PAD * 2, height: r.height + PAD * 2 });
  }, [targetRef]);

  useLayoutEffect(() => {
    if (!open) return;
    targetRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
    measure();
    const id = window.setInterval(measure, 250); // follows smooth scroll / layout shifts
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [open, measure, targetRef]);

  useEffect(() => {
    if (!open) return;
    tipRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onDismiss();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onDismiss]);

  if (!open || !rect || typeof document === "undefined") return null;

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const centerX = rect.left + rect.width / 2;
  const tipWidth = Math.min(TIP_WIDTH, vw - 24);
  const tipLeft = Math.max(12, Math.min(centerX - tipWidth / 2, vw - tipWidth - 12));
  const placeBelow = rect.top + rect.height + 260 < vh || rect.top < 260;
  const arrowLeft = centerX - tipLeft;

  const blocker = "fixed bg-overlay animate-fade-in";

  return createPortal(
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label={message}>
      {/* four dimmed panels around the hole (block clicks, leave target clickable) */}
      <div className={blocker} style={{ top: 0, left: 0, right: 0, height: Math.max(0, rect.top) }} />
      <div className={blocker} style={{ top: rect.top + rect.height, left: 0, right: 0, bottom: 0 }} />
      <div className={blocker} style={{ top: rect.top, left: 0, width: Math.max(0, rect.left), height: rect.height }} />
      <div className={blocker} style={{ top: rect.top, left: rect.left + rect.width, right: 0, height: rect.height }} />

      {/* glowing ring around the target */}
      <div
        className="pointer-events-none fixed animate-pulse-ring rounded-2xl ring-2 ring-primary-foreground/90 transition-all duration-200"
        style={{ top: rect.top, left: rect.left, width: rect.width, height: rect.height }}
      />

      <div
        ref={tipRef}
        tabIndex={-1}
        className="fixed animate-fade-up outline-none"
        style={{
          left: tipLeft,
          width: tipWidth,
          ...(placeBelow ? { top: rect.top + rect.height + 14 } : { bottom: vh - rect.top + 14 }),
        }}
      >
        <div
          className={`absolute flex animate-nudge-up justify-center text-primary-foreground ${placeBelow ? "top-0" : "bottom-0 rotate-180"}`}
          style={{ left: arrowLeft - 16, width: 32 }}
          aria-hidden
        >
          <ArrowUp className="size-8 drop-shadow-lg" strokeWidth={2.5} />
        </div>
        <div className={`${placeBelow ? "mt-10" : "mb-10"} rounded-2xl bg-card p-5 shadow-elevated`}>
          <div className="flex items-start justify-between gap-3">
            <span className="grid size-9 place-items-center rounded-xl bg-lavender-soft text-accent-foreground">
              <Sparkles className="size-4" />
            </span>
            <button
              type="button"
              onClick={onDismiss}
              className="rounded-lg p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Dismiss onboarding guide"
            >
              <X className="size-4" />
            </button>
          </div>
          <p className="mt-3 text-base font-bold text-foreground">{message}</p>
          {detail && <p className="mt-1 text-sm text-muted-foreground">{detail}</p>}
          <div className="mt-4 flex gap-2">
            <Button size="sm" variant="hero" onClick={onPrimary}>
              {primaryLabel}
            </Button>
            <Button size="sm" variant="ghost" onClick={onDismiss}>
              Later
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
