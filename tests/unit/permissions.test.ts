import { describe, expect, it } from "vitest";
import { canEdit, canManageTrip, canTransitionTrip } from "@/lib/utils/permissions";

describe("permission helpers", () => {
  it("allows owners and editors to edit, but not viewers", () => {
    expect(canEdit("owner")).toBe(true);
    expect(canEdit("editor")).toBe(true);
    expect(canEdit("viewer")).toBe(false);
  });

  it("restricts trip management to owners", () => {
    expect(canManageTrip("owner")).toBe(true);
    expect(canManageTrip("editor")).toBe(false);
    expect(canManageTrip("viewer")).toBe(false);
  });

  it("allows V1 lifecycle transitions", () => {
    expect(canTransitionTrip("planning", "completed")).toBe(true);
    expect(canTransitionTrip("completed", "archived")).toBe(true);
    expect(canTransitionTrip("archived", "completed")).toBe(true);
    expect(canTransitionTrip("archived", "active")).toBe(false);
  });
});
