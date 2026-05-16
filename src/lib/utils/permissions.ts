import type { Role, TripStatus } from "@/lib/db/types";

export function canEdit(role: Role) {
  return role === "owner" || role === "editor";
}

export function canManageTrip(role: Role) {
  return role === "owner";
}

export function canTransitionTrip(from: TripStatus, to: TripStatus) {
  if (from === to) return true;
  if (from === "planning" && (to === "active" || to === "completed" || to === "archived")) return true;
  if (from === "active" && (to === "completed" || to === "archived")) return true;
  if (from === "completed" && to === "archived") return true;
  if (from === "archived" && to === "completed") return true;
  return false;
}
