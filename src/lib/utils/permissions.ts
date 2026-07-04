import type { AppRole, TripStatus } from "@/lib/db/types";

export function isAppAdmin(appRole: AppRole) {
  return appRole === "admin";
}

export function canEdit(appRole: AppRole) {
  return isAppAdmin(appRole);
}

export function canEditTrip(trip: { deleted_at: string | null; trip_status: TripStatus }, appRole: AppRole) {
  return canEdit(appRole) && trip.deleted_at === null;
}

export function canManageTrip(appRole: AppRole) {
  return isAppAdmin(appRole);
}

export function canAddExpense(appRole: AppRole) {
  return appRole === "admin" || appRole === "viewer";
}

export function canAccessOverview(appRole: AppRole) {
  return appRole === "admin" || appRole === "viewer";
}

export function canAccessExpenses(appRole: AppRole) {
  return appRole === "admin" || appRole === "viewer";
}

export function canAccessTripPlan(appRole: AppRole) {
  return appRole === "admin" || appRole === "viewer";
}

export function canAccessPlaces(appRole: AppRole) {
  return appRole === "admin" || appRole === "viewer";
}

export function canAccessAdmin(appRole: AppRole) {
  return isAppAdmin(appRole);
}

export function canTransitionTrip(from: TripStatus, to: TripStatus) {
  if (from === to) return true;
  if (from === "planning" && to === "active") return true;
  if (from === "active" && to === "completed") return true;
  if (from === "completed" && to === "archived") return true;
  return false;
}
