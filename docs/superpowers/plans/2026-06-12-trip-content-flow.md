# Trip Content Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Overview read-only, centralize Hotel and Flight creation on Places, and move Invite and Archive actions onto owned trip cards.

**Architecture:** Add additive `trip_hotels` and `trip_flights` tables with trip-scoped RLS and RPC mutations, plus nullable planned date/time fields on `places`. Server pages load access-validated data, focused client components own sheets and forms, and pure utilities select current/next summary records.

**Tech Stack:** Next.js App Router, TypeScript, Supabase/Postgres, Server Actions, React Hook Form, Zod, Tailwind CSS, Vitest.

---

### Task 1: Logistics Domain And Migration

**Files:**
- Create: `src/lib/utils/trip-logistics.ts`
- Create: `tests/unit/trip-logistics.test.ts`
- Create: `supabase/migrations/010_trip_hotels_and_flights.sql`
- Create: `tests/unit/trip-logistics-migration.test.ts`
- Modify: `src/lib/db/types.ts`
- Modify: `src/lib/db/query-keys.ts`

- [ ] Write failing utility tests for legacy-hotel normalization, current/next hotel selection, next/recent flight selection, and hotel date validation.
- [ ] Run `corepack pnpm test -- tests/unit/trip-logistics.test.ts` and verify the missing module failure.
- [ ] Implement typed hotel/flight helpers and rerun the test until it passes.
- [ ] Write a failing migration contract test that requires tables, RLS, RPCs, and nullable place date/time columns.
- [ ] Add migration `010` and database TypeScript definitions, then rerun migration tests.

### Task 2: Queries And Server Actions

**Files:**
- Create: `src/lib/actions/trip-logistics.ts`
- Modify: `src/lib/actions/places.ts`
- Modify: `src/lib/db/queries.ts`
- Test: `tests/unit/trip-logistics-actions.test.ts`

- [ ] Write failing source-contract tests for Zod validation, RPC-only hotel/flight writes, and place planned date/time arguments.
- [ ] Add `getTripLogistics`, structured creation actions, and place date/time support.
- [ ] Revalidate Overview and Places after successful mutations.
- [ ] Run the focused tests and typecheck the affected data layer.

### Task 3: Places Add Flow

**Files:**
- Create: `src/components/places/places-add-sheet.tsx`
- Create: `src/components/places/trip-logistics-cards.tsx`
- Modify: `src/app/(protected)/trips/[tripId]/places/page.tsx`
- Test: `tests/unit/places-add-sheet.test.tsx`

- [ ] Write failing interaction tests for the `+ Add` menu and its three choices.
- [ ] Build responsive React Hook Form sheets for Hotel, Flight, and Place.
- [ ] Render structured hotel/flight cards and retain all existing place delete/restore/map behavior.
- [ ] Verify viewer controls remain hidden and mobile controls keep 44px targets.

### Task 4: Read-Only Overview

**Files:**
- Create: `src/components/overview/trip-logistics-summary.tsx`
- Modify: `src/app/(protected)/trips/[tripId]/overview/page.tsx`
- Test: `tests/unit/trip-logistics-summary.test.tsx`
- Test: `tests/unit/trip-flow-pages.test.ts`

- [ ] Write failing tests for Hotel and Flight summaries, detail sheets, empty `Add in Places` links, and absence of itinerary creation.
- [ ] Replace editable itinerary/logistics content with summary cards and compact trip totals.
- [ ] Keep Complete Trip owner-only, and remove Invite and Archive from Overview.
- [ ] Run focused component and page-contract tests.

### Task 5: Trips Card Owner Actions

**Files:**
- Create: `src/components/trips/trip-card-actions.tsx`
- Modify: `src/app/(protected)/trips/page.tsx`
- Test: `tests/unit/trip-card-actions.test.tsx`

- [ ] Write failing tests for primary Open, owner-only Invite/Archive, and the invite sheet.
- [ ] Reuse existing invite and archive Server Actions from the trip card.
- [ ] Preserve archived/deleted restore behavior and hide owner actions on shared cards.
- [ ] Run the focused tests.

### Task 6: Remove Hotel And Flight Creation From Plan

**Files:**
- Modify: `src/components/trip/add-itinerary-plan.tsx`
- Modify: `src/lib/actions/trips.ts`
- Modify: `src/lib/utils/schedule-item-plan.ts`
- Modify: relevant existing Plan tests

- [ ] Update tests first so Plan accepts only generic itinerary Place input.
- [ ] Remove Hotel and Flight choices and their schedule-item parsing branches.
- [ ] Preserve add, edit, delete, and reorder behavior for itinerary items.
- [ ] Run all Plan tests.

### Task 7: Verification

**Files:**
- Modify only files needed to resolve verification failures.

- [ ] Run `corepack pnpm lint`.
- [ ] Run `corepack pnpm typecheck`.
- [ ] Run `corepack pnpm test`.
- [ ] Run `corepack pnpm build`.
- [ ] Verify `/trips`, Overview, Places, and Plan at mobile and desktop widths in the local browser.
- [ ] Confirm migration `010` is not applied to a hosted database without explicit approval.
