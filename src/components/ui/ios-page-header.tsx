import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

export function IOSPageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("flex min-w-0 flex-col gap-3 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="min-w-0">
        {eyebrow ? <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--muted-foreground)]">{eyebrow}</div> : null}
        <h1 className="text-[clamp(1.75rem,6vw,2.75rem)] font-bold tracking-[-0.04em] text-[var(--foreground)]">{title}</h1>
        {description ? <div className="mt-1.5 max-w-3xl text-sm leading-5 text-[var(--muted-foreground)] sm:text-base sm:leading-6">{description}</div> : null}
      </div>
      {actions ? <div className="flex w-full min-w-0 flex-wrap gap-1.5 sm:w-auto sm:shrink-0 sm:justify-end">{actions}</div> : null}
    </header>
  );
}
