import type { Role, TripStatus } from "@/lib/db/types";

export function canEdit(role: Role) {
  return role === "owner" || role === "editor";
}

export function canEditTrip(role: Role, trip: { deleted_at: string | null; trip_status: TripStatus }) {
  return canEdit(role) && trip.deleted_at === null && (trip.trip_status === "planning" || trip.trip_status === "active");
}

export function canManageTrip(role: Role) {
  return role === "owner";
}

export function canTransitionTrip(from: TripStatus, to: TripStatus) {
  if (from === to) return true;
  if (from === "planning" && to === "active") return true;
  if (from === "active" && to === "completed") return true;
  if (from === "completed" && to === "archived") return true;
  return false;
}
