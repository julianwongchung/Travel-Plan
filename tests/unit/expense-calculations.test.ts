import { describe, expect, it } from "vitest";
import {
  calculateEqualSplits,
  calculateEstimatedMyr,
  estimateAmountInMyr,
  summarizeByCategoryCurrency,
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

  it("keeps original totals grouped independently from MYR conversion", () => {
    expect(summarizeByCurrency([
      { currency: "SGD", total_amount: 10 },
      { currency: "SGD", total_amount: 5.5 },
      { currency: "JPY", total_amount: 1000 },
    ])).toEqual({ SGD: 15.5, JPY: 1000 });
  });

  it("estimates mixed-currency expenses in MYR without changing original totals", () => {
    const expenses = [
      { currency: "MYR", total_amount: 40 },
      { currency: "SGD", total_amount: 10 },
      { currency: "JPY", total_amount: 1000 },
      { currency: "VND", total_amount: 100000 },
      { currency: "CNY", total_amount: 10 },
    ];

    expect(estimateAmountInMyr("SGD", 10)).toBe(35);
    expect(estimateAmountInMyr("CNY", 10)).toBe(6.5);
    expect(calculateEstimatedMyr(expenses)).toBeCloseTo(130.5, 2);
    expect(summarizeByCurrency(expenses)).toEqual({
      CNY: 10,
      JPY: 1000,
      MYR: 40,
      SGD: 10,
      VND: 100000,
    });
  });

  it("groups category totals by original currency without conversion", () => {
    const result = summarizeByCategoryCurrency([
      { category: "Food", currency: "SGD", total_amount: 25 },
      { category: "food", currency: "MYR", total_amount: 40 },
      { category: "transport", currency: "JPY", total_amount: 2500 },
      { category: "Hotel", currency: "MYR", total_amount: 300 },
      { category: "insurance", currency: "MYR", total_amount: 50 },
      { category: "souvenir", currency: "MYR", total_amount: 20 },
    ]);

    expect(result).toEqual({
      food: { MYR: 40, SGD: 25 },
      hotel: { MYR: 300 },
      insurance: { MYR: 50 },
      other: { MYR: 20 },
      transport: { JPY: 2500 },
    });
  });
});
