import { Badge } from "@/components/ui/badge";
import type { TripStatus } from "@/lib/db/types";

export function StatusBadge({ status }: { status: TripStatus }) {
  return <Badge>{status.replace("-", " ")}</Badge>;
}
