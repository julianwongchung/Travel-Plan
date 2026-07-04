import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ExpenseTotalSummary } from "@/components/expenses/expense-total-summary";

describe("ExpenseTotalSummary", () => {
  it("shows estimated MYR total alongside original currency totals", () => {
    const markup = renderToStaticMarkup(createElement(ExpenseTotalSummary, {
      estimatedMyrTotal: 1165,
      totalsByCurrency: {
        SGD: 200,
        JPY: 15_000,
      },
    }));

    expect(markup).toContain("Total Expenses");
    expect(markup).toContain("Estimated in MYR");
    expect(markup).toContain("RM");
    expect(markup).toContain("1,165.00");
    expect(markup).toContain("SGD");
    expect(markup).toContain("200.00");
    expect(markup).toContain("JPY");
    expect(markup).toContain("15,000");
    expect(markup).toContain("Original currency totals");
  });

  it("shows an empty state when there are no expenses", () => {
    const markup = renderToStaticMarkup(createElement(ExpenseTotalSummary, {
      estimatedMyrTotal: 0,
      totalsByCurrency: {},
    }));

    expect(markup).toContain("No expenses yet.");
    expect(markup).toContain("Estimated in MYR");
    expect(markup).not.toContain("RM");
  });
});
