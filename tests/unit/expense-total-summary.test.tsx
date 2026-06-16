import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ExpenseTotalSummary } from "@/components/expenses/expense-total-summary";

describe("ExpenseTotalSummary", () => {
  it("shows original totals and a prominent estimated MYR total", () => {
    const markup = renderToStaticMarkup(createElement(ExpenseTotalSummary, {
      totalsByCurrency: {
        SGD: 200,
        JPY: 15_000,
      },
      estimatedMyr: 1234.56,
      updatedAt: "2024-06-14T00:00:00.000Z",
      attributionUrl: "https://www.exchangerate-api.com",
    }));

    expect(markup).toContain("Total Expenses");
    expect(markup).toContain("SGD");
    expect(markup).toContain("200.00");
    expect(markup).toContain("JPY");
    expect(markup).toContain("15,000");
    expect(markup).toContain("Estimated in MYR");
    expect(markup).toContain("RM 1,234.56");
    expect(markup).toContain("Rates updated");
    expect(markup).toContain("14 Jun 2024");
    expect(markup).toContain("Rates by Exchange Rate API");
  });

  it("shows a zero estimate when there are no expenses", () => {
    const markup = renderToStaticMarkup(createElement(ExpenseTotalSummary, {
      totalsByCurrency: {},
      estimatedMyr: 0,
      updatedAt: null,
      attributionUrl: "https://www.exchangerate-api.com",
    }));

    expect(markup).toContain("No expenses yet.");
    expect(markup).toContain("RM 0.00");
    expect(markup).not.toContain("MYR estimate unavailable");
  });

  it("keeps original totals visible when the MYR estimate is unavailable", () => {
    const markup = renderToStaticMarkup(createElement(ExpenseTotalSummary, {
      totalsByCurrency: { SGD: 200 },
      estimatedMyr: null,
      updatedAt: null,
      attributionUrl: "https://www.exchangerate-api.com",
    }));

    expect(markup).toContain("SGD");
    expect(markup).toContain("200.00");
    expect(markup).toContain("MYR estimate unavailable. Please check exchange rate.");
  });
});
