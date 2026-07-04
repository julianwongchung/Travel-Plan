import { describe, expect, it } from "vitest";
import { canAccessAdmin, canAccessExpenses, canAccessOverview, canAccessPlaces, canAccessTripPlan, canAddExpense, canEdit, canEditTrip, canManageTrip, canTransitionTrip, isAppAdmin } from "@/lib/utils/permissions";

describe("permission helpers", () => {
  it("uses only Admin and Viewer account permissions", () => {
    expect(isAppAdmin("admin")).toBe(true);
    expect(isAppAdmin("viewer")).toBe(false);
    expect(canEdit("admin")).toBe(true);
    expect(canEdit("viewer")).toBe(false);
    expect(canManageTrip("admin")).toBe(true);
    expect(canManageTrip("viewer")).toBe(false);
  });

  it("allows Admin to edit non-deleted trips and blocks Viewer trip edits", () => {
    expect(canEditTrip({ deleted_at: null, trip_status: "planning" }, "admin")).toBe(true);
    expect(canEditTrip({ deleted_at: null, trip_status: "active" }, "admin")).toBe(true);
    expect(canEditTrip({ deleted_at: null, trip_status: "completed" }, "admin")).toBe(true);
    expect(canEditTrip({ deleted_at: null, trip_status: "archived" }, "admin")).toBe(true);
    expect(canEditTrip({ deleted_at: null, trip_status: "planning" }, "viewer")).toBe(false);
    expect(canEditTrip({ deleted_at: "2026-06-20T00:00:00Z", trip_status: "planning" }, "admin")).toBe(false);
  });

  it("lets Viewer read trip pages and add expenses only", () => {
    expect(canAccessTripPlan("admin")).toBe(true);
    expect(canAccessPlaces("admin")).toBe(true);
    expect(canAccessAdmin("admin")).toBe(true);
    expect(canAddExpense("admin")).toBe(true);
    expect(canAccessOverview("viewer")).toBe(true);
    expect(canAccessExpenses("viewer")).toBe(true);
    expect(canAccessTripPlan("viewer")).toBe(true);
    expect(canAccessPlaces("viewer")).toBe(true);
    expect(canAddExpense("viewer")).toBe(true);
    expect(canEdit("viewer")).toBe(false);
    expect(canManageTrip("viewer")).toBe(false);
    expect(canAccessAdmin("viewer")).toBe(false);
  });

  it("allows V1 lifecycle transitions", () => {
    expect(canTransitionTrip("planning", "active")).toBe(true);
    expect(canTransitionTrip("active", "completed")).toBe(true);
    expect(canTransitionTrip("completed", "archived")).toBe(true);
    expect(canTransitionTrip("planning", "completed")).toBe(false);
    expect(canTransitionTrip("archived", "completed")).toBe(false);
    expect(canTransitionTrip("archived", "active")).toBe(false);
  });
});
