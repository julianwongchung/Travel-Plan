import type { HTMLAttributes } from "react";
import { GlassCard, GlassCardContent, GlassCardHeader } from "@/components/ui/glass-card";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <GlassCard className={className} {...props} />;
}

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <GlassCardHeader className={className} {...props} />;
}

export function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <GlassCardContent className={className} {...props} />;
}
