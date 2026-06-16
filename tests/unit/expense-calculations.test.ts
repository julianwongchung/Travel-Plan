import { describe, expect, it } from "vitest";
import {
  calculateEqualSplits,
  calculateEstimatedMyrByCategory,
  calculateEstimatedMyrTotal,
  summarizeByCurrency,
  validateCustomSplits,
} from "@/lib/utils/expense-calculations";

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

  it("converts each original expense into MYR before summing", () => {
    const expenses = [
      { currency: "SGD", total_amount: 200 },
      { currency: "JPY", total_amount: 15_000 },
      { currency: "MYR", total_amount: 50 },
    ];

    expect(calculateEstimatedMyrTotal(expenses, { SGD: 0.25, JPY: 25 })).toBe(1450);
  });

  it("uses an implicit MYR rate and rounds only the final estimate", () => {
    expect(calculateEstimatedMyrTotal([{ currency: "MYR", total_amount: 123.456 }], null)).toBe(123.46);
    expect(calculateEstimatedMyrTotal([{ currency: "USD", total_amount: 1 }], { USD: 0.3 })).toBe(3.33);
  });

  it("rejects a partial estimate when a required rate is missing or invalid", () => {
    const expenses = [
      { currency: "SGD", total_amount: 20 },
      { currency: "THB", total_amount: 100 },
    ];

    expect(calculateEstimatedMyrTotal(expenses, { SGD: 0.25 })).toBeNull();
    expect(calculateEstimatedMyrTotal(expenses, { SGD: 0.25, THB: 0 })).toBeNull();
  });

  it("keeps original totals grouped independently from MYR conversion", () => {
    expect(summarizeByCurrency([
      { currency: "SGD", total_amount: 10 },
      { currency: "SGD", total_amount: 5.5 },
      { currency: "JPY", total_amount: 1000 },
    ])).toEqual({ SGD: 15.5, JPY: 1000 });
  });

  it("converts and groups category totals in MYR without mixing original currencies", () => {
    expect(calculateEstimatedMyrByCategory([
      { category: "Food", currency: "SGD", total_amount: 25 },
      { category: "food", currency: "MYR", total_amount: 40 },
      { category: "transport", currency: "JPY", total_amount: 2500 },
      { category: "souvenir", currency: "MYR", total_amount: 20 },
    ], {
      SGD: 0.25,
      JPY: 25,
    })).toEqual({
      food: 140,
      transport: 100,
      other: 20,
    });
  });

  it("does not show a partial category breakdown when a required rate is unavailable", () => {
    expect(calculateEstimatedMyrByCategory([
      { category: "food", currency: "SGD", total_amount: 25 },
      { category: "purchase", currency: "THB", total_amount: 100 },
    ], {
      SGD: 0.25,
    })).toBeNull();
  });
});
