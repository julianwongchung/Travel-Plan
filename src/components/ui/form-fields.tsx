import { forwardRef, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

export function Field({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <label className={cn("grid min-w-0 gap-2 text-sm font-semibold text-[var(--foreground)]", className)}>
      <span>{label}</span>
      {children}
    </label>
  );
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...props }, ref) {
  return (
    <input
      ref={ref}
      className={cn("min-h-12 w-full min-w-0 max-w-full rounded-[16px] border border-[var(--border)] bg-[var(--muted)] px-4 py-3 text-base text-[var(--foreground)] outline-none transition placeholder:text-[var(--muted-foreground)] focus:border-[var(--primary)] focus:bg-[var(--card-strong)] focus:ring-4 focus:ring-[var(--primary-soft)] sm:text-sm", className)}
      {...props}
    />
  );
});

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn("min-h-28 w-full min-w-0 max-w-full resize-y rounded-[16px] border border-[var(--border)] bg-[var(--muted)] px-4 py-3 text-base text-[var(--foreground)] outline-none transition placeholder:text-[var(--muted-foreground)] focus:border-[var(--primary)] focus:bg-[var(--card-strong)] focus:ring-4 focus:ring-[var(--primary-soft)] sm:text-sm", className)}
      {...props}
    />
  );
}

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn("min-h-12 w-full min-w-0 max-w-full rounded-[16px] border border-[var(--border)] bg-[var(--muted)] px-4 py-3 text-base text-[var(--foreground)] outline-none transition focus:border-[var(--primary)] focus:bg-[var(--card-strong)] focus:ring-4 focus:ring-[var(--primary-soft)] sm:text-sm", className)}
      {...props}
    />
  );
}
