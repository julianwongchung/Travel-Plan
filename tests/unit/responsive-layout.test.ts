import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const globals = readFileSync("src/app/globals.css", "utf8");
const tripShell = readFileSync("src/components/layout/trip-shell.tsx", "utf8");
const floatingTabBar = readFileSync("src/components/ui/floating-tab-bar.tsx", "utf8");
const expensesPage = readFileSync("src/app/(protected)/trips/[tripId]/expenses/page.tsx", "utf8");
const rootLayout = readFileSync("src/app/layout.tsx", "utf8");

describe("responsive layout contracts", () => {
  it("prevents page-level horizontal overflow and wraps long content", () => {
    expect(globals).toContain("overflow-x: clip");
    expect(globals).toContain("overflow-wrap: anywhere");
  });

  it("keeps the mobile shell through tablet widths", () => {
    expect(tripShell).toContain("xl:block");
    expect(tripShell).toContain("xl:ml-80");
    expect(floatingTabBar).toContain("xl:hidden");
  });

  it("uses a compact mobile trip header without shrinking touch targets", () => {
    expect(tripShell).toContain("min-h-14");
    expect(tripShell).toContain("size-11");
    expect(tripShell).toContain("min-h-6 px-2 py-0.5 text-[10px]");
  });

  it("enables device-width and safe-area viewport behavior", () => {
    expect(rootLayout).toContain('width: "device-width"');
    expect(rootLayout).toContain('viewportFit: "cover"');
  });

  it("uses expense cards until laptop widths", () => {
    expect(expensesPage).toContain("lg:hidden");
    expect(expensesPage).toContain("hidden max-w-full overflow-x-auto lg:block");
  });

  it("places the MYR expense summary above expense entry controls", () => {
    const summaryIndex = expensesPage.indexOf("<ExpenseTotalSummary");
    const expenseFormIndex = expensesPage.indexOf("<AddExpenseSheet");

    expect(summaryIndex).toBeGreaterThan(-1);
    expect(expenseFormIndex).toBeGreaterThan(summaryIndex);
    expect(expensesPage).not.toContain("without converting currencies");
  });

  it("uses the responsive expense sheet instead of an inline creation form", () => {
    expect(expensesPage).toContain("<AddExpenseSheet");
    expect(expensesPage).not.toContain("<form action={createExpense");
  });

  it("shows a category donut after the MYR total summary", () => {
    const summaryIndex = expensesPage.indexOf("<ExpenseTotalSummary");
    const chartIndex = expensesPage.indexOf("<ExpenseCategoryChart");

    expect(chartIndex).toBeGreaterThan(summaryIndex);
  });
});
