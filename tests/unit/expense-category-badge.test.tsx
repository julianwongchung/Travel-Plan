import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ExpenseCategoryBadge } from "@/components/expenses/expense-category-badge";

describe("ExpenseCategoryBadge", () => {
  it.each([
    ["food", "Food", "expense-category-food"],
    ["transport", "Transport", "expense-category-transport"],
    ["purchase", "Purchase", "expense-category-purchase"],
  ])("renders %s with its category color and icon treatment", (category, label, className) => {
    const markup = renderToStaticMarkup(
      createElement(ExpenseCategoryBadge, { category }),
    );

    expect(markup).toContain(label);
    expect(markup).toContain(className);
    expect(markup).toContain("<svg");
  });
});
