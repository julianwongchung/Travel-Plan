import { describe, expect, it } from "vitest";
import { canEdit, canEditTrip, canManageTrip, canTransitionTrip } from "@/lib/utils/permissions";

describe("permission helpers", () => {
  it("allows owners and editors to edit, but not viewers", () => {
    expect(canEdit("owner")).toBe(true);
    expect(canEdit("editor")).toBe(true);
    expect(canEdit("viewer")).toBe(false);
  });

  it("allows trip editing only for active, non-deleted owner/editor trips", () => {
    expect(canEditTrip("owner", { deleted_at: null, trip_status: "planning" })).toBe(true);
    expect(canEditTrip("editor", { deleted_at: null, trip_status: "active" })).toBe(true);
    expect(canEditTrip("viewer", { deleted_at: null, trip_status: "planning" })).toBe(false);
    expect(canEditTrip("owner", { deleted_at: "2026-06-20T00:00:00Z", trip_status: "planning" })).toBe(false);
    expect(canEditTrip("editor", { deleted_at: null, trip_status: "completed" })).toBe(false);
    expect(canEditTrip("owner", { deleted_at: null, trip_status: "archived" })).toBe(false);
  });

  it("restricts trip management to owners", () => {
    expect(canManageTrip("owner")).toBe(true);
    expect(canManageTrip("editor")).toBe(false);
    expect(canManageTrip("viewer")).toBe(false);
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
