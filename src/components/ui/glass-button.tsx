import Link from "next/link";
import { forwardRef, type AnchorHTMLAttributes, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

export type GlassButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "glass";

const variants: Record<GlassButtonVariant, string> = {
  primary: "border-transparent bg-[var(--primary)] text-[var(--primary-foreground)] shadow-[0_10px_24px_var(--primary-soft)] hover:bg-[var(--primary-hover)]",
  secondary: "border-[var(--border)] bg-[var(--card-strong)] text-[var(--foreground)] shadow-sm hover:bg-[var(--muted)]",
  ghost: "border-transparent bg-transparent text-[var(--foreground)] hover:bg-[var(--muted)]",
  danger: "border-transparent bg-[var(--danger)] text-white shadow-[0_10px_24px_var(--danger-soft)] hover:brightness-95",
  glass: "glass-surface text-[var(--foreground)]",
};

const base = "ios-pressable inline-flex min-h-11 min-w-0 max-w-full items-center justify-center gap-1 whitespace-normal rounded-full border px-3.5 py-1 text-center text-[13px] font-semibold leading-5 disabled:cursor-not-allowed disabled:opacity-50";

export const GlassButton = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & { variant?: GlassButtonVariant }>(function GlassButton({
  className,
  variant = "primary",
  ...props
}, ref) {
  return <button ref={ref} className={cn(base, variants[variant], className)} {...props} />;
});

export function GlassButtonLink({
  className,
  variant = "primary",
  children,
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; children?: ReactNode; variant?: GlassButtonVariant }) {
  return <Link className={cn(base, variants[variant], className)} {...props}>{children}</Link>;
}
