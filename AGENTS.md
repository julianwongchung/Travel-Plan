# Travel OS — Codex Agent Instructions

Use the `travel-os` skill for every task related to this repository.

The detailed skill file should be placed at:

```txt
.agents/skills/travel-os/SKILL.md
```

This `AGENTS.md` file gives repo-level rules that Codex should always follow before implementing, debugging, refactoring, testing, or deploying the app.

---

# Product Summary

Travel OS is a private-first collaborative travel planning and expense tracking web application.

The app is:

- A private trip workspace by default
- Shared only through trip-level invitations
- Built with Next.js App Router, TypeScript, Supabase, React Query, Tailwind CSS, and shadcn/ui
- Deployed on Vercel

Think:

```txt
Google Docs-style private sharing
+
Excel-style itinerary planner
+
Expense tracker
+
Google Maps notebook
```

---

# Non-Negotiable V1 Scope

Build V1 with these pages only:

1. `/login`
2. `/trips`
3. `/trips/[tripId]/overview`
4. `/trips/[tripId]/trip-plan`
5. `/trips/[tripId]/places`
6. `/trips/[tripId]/expenses`

Also build:

- `/trips/[tripId]/layout.tsx`
- Create Trip flow
- Invite Member flow
- Complete Trip flow
- Archive Trip flow

Page responsibilities:

- Overview is a read-only dashboard. It must not contain add, edit, delete, or reorder controls.
- Trip Plan is the editable itinerary planning page. It owns day-tab planning, add/edit/delete/reorder schedule item controls, and must respect account permissions.
- Places is for saved places.
- Expenses is for expense tracking.

Do not add these unless explicitly requested later:

- Signup page
- Settlement page
- Settlement logic
- OCR receipt scanning
- AI suggestions
- Currency conversion
- Live FX rates
- Offline / PWA support

---

# Privacy Model

Every user has their own private workspace by default.

A trip is visible to another user only when Admin explicitly grants access to that specific trip.

Inviting someone to one trip must never expose other trips.

Correct model:

```txt
One Supabase project
One shared schema
Strict RLS
Trip-level membership
Private-by-default rows
```

Do not create one physical database per user.

---

# Permission Rules

Account types:

- Admin
- Viewer

Admin can:

- Access all pages
- View, create, edit, archive, restore, and delete trips
- Edit overview items
- Add, edit, delete, and reorder itinerary items
- Add, edit, and delete flights, hotels, places, and expenses
- Invite members
- Manage users
- Assign Admin or Viewer account type
- Access the admin page

Viewer can:

- Log in
- View allowed trip pages
- View overview, itinerary, flights, hotels, places, and expenses
- Add new expenses

Viewer cannot:

- Create, edit, archive, restore, or delete trips
- Add, edit, delete, or reorder itinerary items
- Add, edit, or delete flights, hotels, or places
- Manage users or account types
- Access admin pages or hidden admin routes

Viewer must only see the Add Expense mutation control.

---

# Architecture Rules

Use three clear layers:

## Layer 1 — Server Components

Use for:

- Login shell
- My Trips initial load
- Trip layout access validation
- Static auth-gated shell

Do not use Server Components as the source of truth for mutable trip data.

## Layer 2 — React Query

React Query owns mutable trip data:

- Trips
- Trip days
- Schedule items
- Places
- Expenses
- Travelers
- Members
- Invitations

## Layer 3 — Supabase Realtime

Realtime only invalidates React Query.

Allowed:

```ts
queryClient.invalidateQueries({ queryKey })
```

Forbidden:

- Realtime local state patching
- Direct cache mutation from realtime events
- Realtime becoming a second source of truth

---

# Supabase Rules

Use Supabase for:

- Auth
- Postgres
- RLS
- RPC
- Realtime

Use `@supabase/ssr`.

Sensitive mutations must go through RPC.

Do not perform protected table writes directly from client components.

Never expose:

```txt
SUPABASE_SERVICE_ROLE_KEY
SUPABASE_SECRET_KEY
```

---

# RLS Rules

RLS is the final permission layer.

Client-side account checks are UX only.

Every trip-scoped table must check trip membership.

Use helper functions in the `private` schema:

- `private.is_trip_member(trip_id)`
- `private.can_manage_trip(trip_id)`
- `private.can_edit_trip(trip_id)`
- `private.can_add_expense(trip_id)`
- `private.normalize_email(email)`

---

# Trip Status Rules

Use:

```txt
planning | active | completed | archived
```

Trip lifecycle:

```txt
planning → active → completed → archived
```

Use `deleted_at` only for soft delete / trash.

Do not use `deleted_at` to mean completed.

---

# UX Rules

Mobile:

- Bottom navigation
- Drawer forms
- Card-based lists
- Touch targets at least 44px

Desktop:

- Sidebar navigation
- Sticky headers
- Spreadsheet-style itinerary table
- Inline editing where useful

All viewports:

- Loading skeletons
- Empty states
- Error states
- Retry actions
- Permission denied toast
- Session expired toast
- Account type badge

---

# Code Rules

Required:

- TypeScript strict mode
- No `any`
- Zod validation
- React Hook Form
- shadcn/ui
- Tailwind CSS
- Server Actions for mutations
- React Query for mutable data
- Query key factory
- Extract business logic to utilities

Forbidden:

- Direct protected table writes from browser client
- Business logic inside UI components
- Duplicate expense calculation logic
- Global mutable trip state with Zustand or Redux
- Manual production schema edits
- Reintroducing signup or settlement accidentally

---

# File Organization

Preferred structure:

```txt
src/
  app/
    (auth)/
      login/page.tsx
    (protected)/
      trips/page.tsx
      trips/[tripId]/layout.tsx
      trips/[tripId]/overview/page.tsx
      trips/[tripId]/trip-plan/page.tsx
      trips/[tripId]/places/page.tsx
      trips/[tripId]/expenses/page.tsx
  components/
    auth/
    layout/
    trip/
    trips/
    overview/
    places/
    expenses/
    forms/
    modals/
    tables/
    ui/
  lib/
    supabase/
    actions/
    db/
    utils/
supabase/
  migrations/
tests/
  e2e/
  unit/
```

---

# Testing Requirements

Playwright E2E should cover:

- Login
- My Trips only shows accessible trips
- Create private trip
- Open trip workspace
- Overview is read-only and shows summary data
- Add/edit/delete/reorder itinerary items from Trip Plan
- Add place
- Add expense
- Admin invites viewer
- Viewer can add expense
- Viewer cannot mutate trip, itinerary, flight, hotel, place, user, or permission data
- Admin completes trip
- Admin archives and restores trip
- Session expiry handling

Vitest unit tests should cover:

- Equal split rounding
- Custom split validation
- Google Maps link generation
- Email normalization
- Permission helper logic
- Trip status transition logic

---

# Codex Response Requirements

When changing code, always provide:

1. Summary
2. Files changed
3. Code changes
4. Migration changes if any
5. RLS/RPC changes if any
6. Tests added or required
7. Risks or assumptions

When debugging, always provide:

1. Root cause
2. Minimal safe fix
3. Files to change
4. Verification steps

---

# Golden Rule

Do not break:

- Private-first control
- Trip-level sharing
- RLS enforcement
- RPC mutation boundaries
- React Query data source boundaries
- Realtime invalidation-only pattern
- No-signup V1 scope
- No-settlement V1 scope
