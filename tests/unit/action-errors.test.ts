import { describe, expect, it } from "vitest";
import { normalizeActionError } from "@/lib/actions/action-errors";

describe("action error normalization", () => {
  it("maps technical action errors to safe user messages", () => {
    expect(normalizeActionError({ status: 401, message: "JWT expired" }))
      .toBe("Your session has expired. Please log in again.");
    expect(normalizeActionError({ code: "42501", message: "new row violates row-level security policy" }))
      .toBe("You do not have permission to do this.");
    expect(normalizeActionError({ code: "23505", message: "duplicate key value violates unique constraint" }))
      .toBe("This item already exists.");
    expect(normalizeActionError({ code: "08006", message: "connection failure" }))
      .toBe("Something went wrong. Please try again.");
  });

  it("keeps explicit validation messages safe and readable", () => {
    expect(normalizeActionError({ code: "P0001", message: "Traveler name is required" }))
      .toBe("Traveler name is required");
  });
});
