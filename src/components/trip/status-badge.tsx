import { StatusBadge as UIStatusBadge } from "@/components/ui/status-badge";
import type { TripStatus } from "@/lib/db/types";

export function StatusBadge({ status, className }: { status: TripStatus; className?: string }) {
  return <UIStatusBadge status={status} className={className} />;
}
