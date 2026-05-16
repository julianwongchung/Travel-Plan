import { Badge } from "@/components/ui/badge";
import type { Role } from "@/lib/db/types";

export function RoleBadge({ role }: { role: Role }) {
  const label = role[0].toUpperCase() + role.slice(1);
  return <Badge className={role === "owner" ? "border-teal-200 bg-teal-50 text-teal-800" : undefined}>{label}</Badge>;
}
