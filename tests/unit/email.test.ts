import { describe, expect, it } from "vitest";
import { normalizeEmail } from "@/lib/utils/email";

describe("email normalization", () => {
  it("trims and lowercases email addresses", () => {
    expect(normalizeEmail("  JULIAN@Example.COM ")).toBe("julian@example.com");
  });
});
