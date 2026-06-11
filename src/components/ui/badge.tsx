import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

export function Badge({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex min-h-7 max-w-full items-center whitespace-normal rounded-full border border-[var(--border)] bg-[var(--muted)] px-2.5 py-1 text-center text-xs font-semibold leading-4 text-[var(--muted-foreground)]",
        className,
      )}
      {...props}
    />
  );
}
