import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

type GlassCardVariant = "content" | "glass" | "subtle";

const variants: Record<GlassCardVariant, string> = {
  content: "content-surface",
  glass: "glass-surface",
  subtle: "border border-[var(--border)] bg-[var(--muted)]",
};

export function GlassCard({
  className,
  variant = "content",
  ...props
}: HTMLAttributes<HTMLDivElement> & { variant?: GlassCardVariant }) {
  return (
    <div
      className={cn(
        "w-full min-w-0 max-w-full rounded-[24px] text-[var(--foreground)]",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}

export function GlassCardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("min-w-0 border-b border-[var(--border)] px-4 py-4 sm:px-6", className)} {...props} />;
}

export function GlassCardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("min-w-0 p-4 sm:p-6", className)} {...props} />;
}
