import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

type StatusTone = "neutral" | "primary" | "success" | "warning" | "danger";

const toneClasses: Record<StatusTone, string> = {
  neutral: "border-[var(--border)] bg-[var(--muted)] text-[var(--muted-foreground)]",
  primary: "border-[rgba(10,132,255,0.2)] bg-[var(--primary-soft)] text-[var(--primary)]",
  success: "border-[rgba(31,157,85,0.2)] bg-[var(--success-soft)] text-[var(--success)]",
  warning: "border-[rgba(199,119,0,0.2)] bg-[var(--warning-soft)] text-[var(--warning)]",
  danger: "border-[rgba(255,69,58,0.2)] bg-[var(--danger-soft)] text-[var(--danger)]",
};

const statusTones: Record<string, StatusTone> = {
  planning: "primary",
  active: "success",
  completed: "success",
  archived: "neutral",
  viewer: "neutral",
  deleted: "danger",
  private: "neutral",
  shared: "primary",
  "must-go": "danger",
  "nice-to-have": "primary",
  skip: "neutral",
};

export function StatusBadge({
  status,
  tone,
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { status: string; tone?: StatusTone }) {
  const resolvedTone = tone ?? statusTones[status.toLowerCase()] ?? "neutral";
  const label = status.replaceAll("-", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

  return (
    <span
      data-tone={resolvedTone}
      className={cn(
        "inline-flex min-h-7 max-w-full items-center whitespace-normal rounded-full border px-2.5 py-1 text-center text-xs font-semibold leading-4",
        toneClasses[resolvedTone],
        className,
      )}
      {...props}
    >
      {label}
    </span>
  );
}
