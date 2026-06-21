import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ExpenseTotalSummary } from "@/components/expenses/expense-total-summary";

describe("ExpenseTotalSummary", () => {
  it("shows original totals without currency conversion", () => {
    const markup = renderToStaticMarkup(createElement(ExpenseTotalSummary, {
      totalsByCurrency: {
        SGD: 200,
        JPY: 15_000,
      },
    }));

    expect(markup).toContain("Total Expenses");
    expect(markup).toContain("SGD");
    expect(markup).toContain("200.00");
    expect(markup).toContain("JPY");
    expect(markup).toContain("15,000");
    expect(markup).not.toContain("Estimated in MYR");
    expect(markup).not.toContain("Exchange Rate API");
    expect(markup).not.toContain("Rates updated");
  });

  it("shows an empty state when there are no expenses", () => {
    const markup = renderToStaticMarkup(createElement(ExpenseTotalSummary, {
      totalsByCurrency: {},
    }));

    expect(markup).toContain("No expenses yet.");
    expect(markup).not.toContain("MYR estimate unavailable");
  });
});
