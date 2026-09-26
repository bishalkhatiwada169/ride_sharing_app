import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Tone = "neutral" | "danger";

type Props = {
  children: ReactNode;
  tone?: Tone;
  className?: string;
};

/** Polite status / assertive alert for async UI feedback (WCAG 4.1.3). */
export function StatusMessage({
  children,
  tone = "neutral",
  className,
}: Props) {
  const isDanger = tone === "danger";
  return (
    <p
      role={isDanger ? "alert" : "status"}
      aria-live={isDanger ? "assertive" : "polite"}
      className={cn(
        "mt-6 max-w-prose text-sm leading-relaxed",
        isDanger
          ? "rounded-xl border border-[var(--color-danger)]/25 bg-red-50 px-3 py-2.5 text-[var(--color-danger)]"
          : "text-[var(--color-ink-soft)]",
        className,
      )}
    >
      {children}
    </p>
  );
}
