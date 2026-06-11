import { StatusBadge } from "@/components/ui/status-badge";
import type { Role } from "@/lib/db/types";

export function RoleBadge({ role, className }: { role: Role; className?: string }) {
  return <StatusBadge status={role} className={className} />;
}
