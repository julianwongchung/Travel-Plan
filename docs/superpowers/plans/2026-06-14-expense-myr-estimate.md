# Expense MYR Estimate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show a resilient, clearly estimated MYR total above the Expense page while preserving every original expense amount and currency.

**Architecture:** Pure utility functions validate provider data and calculate grouped and converted totals. A server-only Next.js cached service fetches MYR-based daily rates, and a focused summary component renders success, empty, and unavailable states before the existing Expense page content.

**Tech Stack:** Next.js App Router, TypeScript, Zod, Vitest, React server rendering, Tailwind CSS.

---

## File Map

- Create `src/lib/utils/exchange-rates.ts`: provider response parsing, rate normalization, and shared exchange-rate types.
- Create `src/lib/exchange-rates/server.ts`: server-only ExchangeRate-API fetch with a 24-hour Next.js persistent cache and graceful unavailable result.
- Modify `src/lib/utils/expense-calculations.ts`: mixed-currency MYR conversion and final rounding.
- Create `src/components/expenses/expense-total-summary.tsx`: Liquid Glass summary card and formatting.
- Modify `src/app/(protected)/trips/[tripId]/expenses/page.tsx`: concurrent rate load, calculation, and summary placement.
- Modify `tests/unit/expense-calculations.test.ts`: conversion behavior.
- Create `tests/unit/exchange-rates.test.ts`: provider response validation.
- Create `tests/unit/expense-total-summary.test.tsx`: rendered success, empty, and unavailable states.
- Modify `tests/unit/responsive-layout.test.ts`: summary placement and responsive page contract.

### Task 1: MYR Calculation

- [x] Add failing tests for mixed-currency conversion, MYR rate handling, final rounding, and missing-rate rejection in `tests/unit/expense-calculations.test.ts`.
- [x] Run `corepack pnpm test tests/unit/expense-calculations.test.ts` and confirm failures are caused by the missing `calculateEstimatedMyrTotal` export.
- [x] Implement `calculateEstimatedMyrTotal(expenses, rates)` in `src/lib/utils/expense-calculations.ts`, using `amount / rate`, an implicit MYR rate of `1`, and final two-decimal rounding.
- [x] Re-run the focused test and confirm it passes.

### Task 2: Provider Validation And Cached Service

- [x] Add failing tests in `tests/unit/exchange-rates.test.ts` for a valid complete provider response and invalid result/base/rate payloads.
- [x] Run the focused test and confirm failure is caused by the missing parser.
- [x] Implement a Zod-backed `parseMyrExchangeRateResponse` in `src/lib/utils/exchange-rates.ts`.
- [x] Re-run the focused parser test and confirm it passes.
- [x] Create `src/lib/exchange-rates/server.ts` with `import "server-only"`, `unstable_cache`, a 24-hour revalidation interval, no-store upstream fetch, non-OK rejection, and a caught `{ available: false }` result.
- [x] Add a source contract assertion to `tests/unit/exchange-rates.test.ts` for server-only execution, `unstable_cache`, and `revalidate: 86400`.
- [x] Run the focused exchange-rate test and confirm it passes.

### Task 3: Expense Total Summary

- [x] Add failing server-rendered component tests for original totals, estimated MYR, update time and attribution, empty expenses, and unavailable mixed-currency estimates.
- [x] Run `corepack pnpm test tests/unit/expense-total-summary.test.tsx` and confirm failure is caused by the missing component.
- [x] Implement `src/components/expenses/expense-total-summary.tsx` with locale-aware original totals, an emphasized `Estimated in MYR` value, warning state, update time, attribution, and responsive Liquid Glass layout.
- [x] Re-run the focused component test and confirm it passes.

### Task 4: Expense Page Integration

- [x] Add a failing page contract assertion that `ExpenseTotalSummary` renders before the add-expense form and that the old “without converting currencies” copy is removed.
- [x] Run `corepack pnpm test tests/unit/responsive-layout.test.ts` and confirm the new assertion fails.
- [x] Update the Expense page to load trip context, expense data, and cached rates concurrently; calculate the MYR estimate; render the summary first; and keep existing original expense rows and controls unchanged.
- [x] Re-run the focused responsive test and all new feature tests.

### Task 5: Verification

- [x] Run `corepack pnpm test`.
- [x] Run `corepack pnpm typecheck`.
- [x] Run `corepack pnpm lint`.
- [x] Run `corepack pnpm build`.
- [x] Run `git diff --check` and inspect the final diff for schema, auth, trip, RLS, or RPC changes.
