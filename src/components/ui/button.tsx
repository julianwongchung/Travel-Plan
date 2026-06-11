import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";
import { GlassButton, GlassButtonLink, type GlassButtonVariant } from "@/components/ui/glass-button";

type Variant = "primary" | "secondary" | "ghost" | "danger";

const variants: Record<Variant, GlassButtonVariant> = {
  primary: "primary",
  secondary: "secondary",
  ghost: "ghost",
  danger: "danger",
};

export function Button({
  className,
  variant = "primary",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return <GlassButton className={className} variant={variants[variant]} {...props} />;
}

export function ButtonLink({
  className,
  variant = "primary",
  children,
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; variant?: Variant; children: ReactNode }) {
  return <GlassButtonLink className={className} variant={variants[variant]} {...props}>{children}</GlassButtonLink>;
}
