import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const globals = readFileSync("src/app/globals.css", "utf8");
const tripShell = readFileSync("src/components/layout/trip-shell.tsx", "utf8");
const loginPage = readFileSync("src/app/(auth)/login/page.tsx", "utf8");
const tripsPage = readFileSync("src/app/(protected)/trips/page.tsx", "utf8");
const appLogo = readFileSync("src/components/layout/app-logo.tsx", "utf8");
const floatingTabBar = readFileSync("src/components/ui/floating-tab-bar.tsx", "utf8");
const expensesPage = readFileSync("src/app/(protected)/trips/[tripId]/expenses/page.tsx", "utf8");
const expensesClient = readFileSync("src/components/expenses/expenses-client.tsx", "utf8");
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

  it("keeps all V1 trip routes in visible navigation", () => {
    const overviewIndex = tripShell.indexOf('label: "Overview"');
    const tripPlanIndex = tripShell.indexOf('label: "Trip Plan"');
    const placesIndex = tripShell.indexOf('label: "Places"');
    const expensesIndex = tripShell.indexOf('label: "Expenses"');

    expect(overviewIndex).toBeGreaterThan(-1);
    expect(tripPlanIndex).toBeGreaterThan(overviewIndex);
    expect(placesIndex).toBeGreaterThan(tripPlanIndex);
    expect(expensesIndex).toBeGreaterThan(placesIndex);
    expect(floatingTabBar).toContain('"places"');
  });

  it("keeps the bottom nav active highlight inside equal-width tabs", () => {
    expect(floatingTabBar).toContain("gridTemplateColumns");
    expect(floatingTabBar).toContain("repeat(${items.length}, minmax(0, 1fr))");
    expect(floatingTabBar).toContain("isActiveTab");
    expect(floatingTabBar).toContain('itemPath === "/trips"');
    expect(floatingTabBar).toContain("overflow-hidden");
  });

  it("uses a compact mobile trip header without shrinking touch targets", () => {
    expect(tripShell).toContain("min-h-14");
    expect(tripShell).toContain("size-11");
    expect(tripShell).toContain("min-h-6 px-2 py-0.5 text-[10px]");
  });

  it("uses the GoGoPlan logo at the top-left of app pages", () => {
    expect(appLogo).toContain("/brand/gogoplan-logo-cropped.png");
    expect(appLogo).toContain('alt="GoGoPlan"');
    expect(loginPage).toContain("absolute left-4 top-4");
    expect(tripsPage).toContain("<AppLogo");
    expect(tripShell).toContain("<AppLogo");
    expect(tripShell).toContain("xl:hidden");
  });

  it("enables device-width and safe-area viewport behavior", () => {
    expect(rootLayout).toContain('width: "device-width"');
    expect(rootLayout).toContain('viewportFit: "cover"');
  });

  it("uses expense cards until laptop widths", () => {
    expect(expensesClient).toContain("lg:hidden");
    expect(expensesClient).toContain("hidden max-w-full overflow-x-auto lg:block");
  });

  it("places original-currency expense totals above expense entry controls", () => {
    const summaryIndex = expensesClient.indexOf("<ExpenseTotalSummary");
    const expenseFormIndex = expensesClient.indexOf("<AddExpenseSheet");

    expect(summaryIndex).toBeGreaterThan(-1);
    expect(expenseFormIndex).toBeGreaterThan(summaryIndex);
    expect(expensesClient).not.toContain("getMyrExchangeRates");
    expect(expensesClient).not.toContain("calculateEstimatedMyr");
  });

  it("uses the responsive expense sheet instead of an inline creation form", () => {
    expect(expensesPage).toContain("ExpensesClient");
    expect(expensesClient).toContain("<AddExpenseSheet");
    expect(expensesClient).not.toContain("<form action={createExpense");
  });

  it("shows category totals after the original-currency summary", () => {
    const summaryIndex = expensesClient.indexOf("<ExpenseTotalSummary");
    const chartIndex = expensesClient.indexOf("<ExpenseCategoryChart");

    expect(chartIndex).toBeGreaterThan(summaryIndex);
  });
});
