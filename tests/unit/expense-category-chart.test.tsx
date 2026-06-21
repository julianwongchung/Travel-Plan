import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ExpenseCategoryChart } from "@/components/expenses/expense-category-chart";

describe("ExpenseCategoryChart", () => {
  it("renders category totals grouped by original currency", () => {
    const markup = renderToStaticMarkup(createElement(ExpenseCategoryChart, {
      categoryTotals: {
        food: { MYR: 40, SGD: 100 },
        transport: { JPY: 2500 },
        purchase: { SGD: 60 },
        hotel: { MYR: 200 },
        insurance: { MYR: 50 },
      },
    }));

    expect(markup).toContain("Category totals");
    expect(markup).toContain("Food");
    expect(markup).toContain("MYR");
    expect(markup).toContain("40.00");
    expect(markup).toContain("SGD");
    expect(markup).toContain("100.00");
    expect(markup).toContain("Transport");
    expect(markup).toContain("JPY");
    expect(markup).toContain("2,500");
    expect(markup).toContain("Purchase");
    expect(markup).toContain("Hotel");
    expect(markup).toContain("Insurance");
    expect(markup).not.toContain("RM 550.00");
    expect(markup).not.toContain("conic-gradient");
    expect(markup).not.toContain("%");
  });

  it("shows a calm empty state when there are no category totals", () => {
    const markup = renderToStaticMarkup(createElement(ExpenseCategoryChart, {
      categoryTotals: {},
    }));

    expect(markup).toContain("No category spending yet.");
    expect(markup).not.toContain("conic-gradient");
  });

  it("keeps legacy categories visible as Other", () => {
    const markup = renderToStaticMarkup(createElement(ExpenseCategoryChart, {
      categoryTotals: {
        food: { MYR: 80 },
        other: { MYR: 20 },
      },
    }));

    expect(markup).toContain("Other");
    expect(markup).toContain("20.00");
  });
});
