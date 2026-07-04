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

  it("explains missing database currency migrations clearly", () => {
    expect(normalizeActionError({
      code: "23514",
      message: 'new row for relation "trips" violates check constraint "trips_currency_check"',
    })).toBe("This currency is not enabled in the database yet. Apply the latest Supabase migration and try again.");
  });

  it("explains missing RPC migrations clearly", () => {
    expect(normalizeActionError({
      code: "PGRST202",
      message: "Could not find the function public.create_trip_with_travelers in the schema cache",
    })).toBe("The database is missing the latest Supabase migrations. Apply the latest migrations and try again.");
  });

  it("keeps admin-only create trip failures actionable", () => {
    expect(normalizeActionError({ code: "P0001", message: "Only admins can create trips" }))
      .toBe("Your account does not have admin permission to create trips.");
  });

  it("keeps explicit validation messages safe and readable", () => {
    expect(normalizeActionError({ code: "P0001", message: "Traveler name is required" }))
      .toBe("Traveler name is required");
  });
});
