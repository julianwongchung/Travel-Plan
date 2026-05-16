import { describe, expect, it } from "vitest";
import { calculateEqualSplits, validateCustomSplits } from "@/lib/utils/expense-calculations";

describe("expense calculations", () => {
  it("uses the last traveler to absorb equal split rounding", () => {
    expect(calculateEqualSplits(10, ["a", "b", "c"])).toEqual([
      { travelerId: "a", amount: 3.33 },
      { travelerId: "b", amount: 3.33 },
      { travelerId: "c", amount: 3.34 },
    ]);
  });

  it("validates custom split totals by cents", () => {
    expect(validateCustomSplits(25.5, [{ travelerId: "a", amount: 10 }, { travelerId: "b", amount: 15.5 }])).toBe(true);
    expect(validateCustomSplits(25.5, [{ travelerId: "a", amount: 10 }, { travelerId: "b", amount: 15 }])).toBe(false);
  });
});
