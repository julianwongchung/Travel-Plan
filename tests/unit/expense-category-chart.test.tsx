import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ExpenseCategoryChart } from "@/components/expenses/expense-category-chart";

describe("ExpenseCategoryChart", () => {
  it("renders a donut with MYR total, category percentages, and matching rows", () => {
    const markup = renderToStaticMarkup(createElement(ExpenseCategoryChart, {
      categoryTotals: {
        food: 140,
        transport: 100,
        purchase: 60,
      },
    }));

    expect(markup).toContain("Category breakdown");
    expect(markup).toContain("RM 300.00");
    expect(markup).toContain("Food");
    expect(markup).toContain("46.7%");
    expect(markup).toContain("Transport");
    expect(markup).toContain("33.3%");
    expect(markup).toContain("Purchase");
    expect(markup).toContain("20.0%");
    expect(markup).toContain("conic-gradient");
    expect(markup).toContain('role="img"');
    expect(markup).toContain("Expense category breakdown");
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
        food: 80,
        other: 20,
      },
    }));

    expect(markup).toContain("Other");
    expect(markup).toContain("20.0%");
  });
});
