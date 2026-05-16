import { describe, expect, it } from "vitest";
import { parseTravelerNames } from "@/lib/utils/travelers";

describe("traveler helpers", () => {
  it("parses comma and newline separated traveler names without blanks or duplicates", () => {
    expect(parseTravelerNames("Julian, Clarrie\nJulian\n  Alex  ")).toEqual(["Julian", "Clarrie", "Alex"]);
  });

  it("returns no travelers for blank input", () => {
    expect(parseTravelerNames("  \n,  ")).toEqual([]);
  });
});
