---
name: travel-os
version: 1.0.0
priority: high
description: >
  Build the Travel OS app — a private-first collaborative travel planning and expense tracking web application.
  Use this skill whenever the user asks to build, extend, debug, refactor, test, or deploy any part of the
  Travel OS project. Covers Next.js App Router pages, Supabase schema + RLS + RPC, React Query hooks,
  Realtime subscriptions, Server Actions, auth flow, trip planning, places, expenses, invitations,
  role permissions, Playwright E2E tests, and deployment.

triggers:
  - travel-os
  - Travel OS
  - trip planner
  - travel planner
  - itinerary
  - my trips
  - trip workspace
  - places
  - expenses
  - invitations
  - Supabase
  - RLS
  - RPC
  - migration
  - React Query
  - Next.js App Router
---

# Travel OS — Build Skill

A production-grade private-first travel planning and expense tracking web application.

Think: **Google Docs-style private sharing × Excel-style itinerary planner × expense tracker × Google Maps notebook.**

---

# 0. Prime Directive

Travel OS must be built as a **private-first trip workspace**.

Every user has their own private travel workspace by default.
A trip is visible to another user only when the owner explicitly invites that user to view or edit that specific trip.

## Highest-priority rules

1. User data is private by default.
2. Trips are shared only by invitation.
3. Sharing is trip-specific, never account-wide.
4. Role-based access must be enforced by Supabase RLS, not only by UI checks.
5. Sensitive mutations must go through RPC.
6. React Query owns mutable client data.
7. Supabase Realtime only invalidates queries; it must not patch local state directly.
8. Do not add signup or settlement features unless explicitly requested later.

When rules conflict:

**Security > Data ownership > Architecture > UX > Feature request**

---

# 1. Current Product Scope

## V1 build now

Build only these pages and flows:

1. Login
2. My Trips
3. Trip Layout / Trip Workspace Shell
4. Overview
5. Trip Plan
6. Places
7. Expenses
8. Complete / Archive Trip flow
9. Invite member flow

## Removed from V1

Do not build:

- Signup page
- Settlement page
- Settlement logic
- OCR receipt scanning
- AI trip suggestions
- Currency conversion
- Live FX rates
- Offline / PWA support

## Phase 2 optional later

- Checklist
- Todos
- Advanced trip settings
- Public trip sharing
- PWA / offline mode

---

# 2. Project Identity

| Property | Value |
|---|---|
| Framework | Next.js 14 App Router + TypeScript |
| Styling | Tailwind CSS + shadcn/ui |
| Data fetching | React Query / TanStack Query v5 |
| Backend | Supabase Auth, Postgres, RLS, Realtime |
| Deployment | Vercel |
| Package manager | pnpm with corepack |
| Testing | Playwright E2E + Vitest unit |

---

# 3. Page Structure

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
      client.ts
      server.ts
      proxy.ts
    actions/
      trips.ts
      places.ts
      expenses.ts
      invitations.ts
    db/
      types.ts
    utils/
      expense-calculations.ts
      google-maps.ts
      email.ts
      permissions.ts
supabase/
  migrations/
    001_schema.sql
    002_rls_policies.sql
    003_rpc_and_triggers.sql
    004_seed_helpers.sql

tests/
  e2e/
  unit/
```

---

# 4. Route List

## Public route

| Route | Purpose |
|---|---|
| `/login` | User login only. No signup page. |

## Protected routes

| Route | Purpose |
|---|---|
| `/trips` | My Trips workspace dashboard |
| `/trips/[tripId]/layout.tsx` | Shared trip shell, guards, nav, role context |
| `/trips/[tripId]/overview` | Logistics overview and itinerary preview dashboard |
| `/trips/[tripId]/trip-plan` | Day-by-day itinerary planner and schedule editor |
| `/trips/[tripId]/places` | Google Maps-style place notebook |
| `/trips/[tripId]/expenses` | Expense tracking and split summary |

## Page count

V1 contains:

- 6 actual pages
- 1 required trip layout shell

Total implementation units:

**6 pages + 1 layout**

---

# 5. Data Ownership Model

## Default state

Every authenticated user operates inside their own private workspace.

A new trip is:

- Owned by the creator
- Private by default
- Visible only to the owner
- Not discoverable by other users

## Collaboration model

Collaboration is granted only at the trip level through:

- `trip_members`
- `trip_invitations`

## Sharing rule

Inviting a user to one trip does not grant access to any other trip.

Example:

```txt
Julian owns:
- Osaka Trip
- Da Nang Trip
- Bangkok Trip

Julian invites Clarrie to Da Nang Trip only.

Clarrie can see:
- Da Nang Trip

Clarrie cannot see:
- Osaka Trip
- Bangkok Trip
```

## Recommended database model

Use one Supabase project and one shared schema.
Use row-level ownership and RLS to create a logical private database per user.

Do not create a separate physical database for every user.

---

# 6. Architecture Layers

Every resource must belong to exactly one layer.
Do not mix data ownership between layers.

## Layer 1 — Server Components

Use for:

- Login page shell
- My Trips initial load
- Trip layout access validation
- Static layout data
- Auth-gated shell

Do not use Server Components as the owner of mutable trip data.

## Layer 2 — React Query

React Query owns all mutable trip data:

- Trips list refresh
- Trip details
- Trip days
- Schedule items
- Places
- Expenses
- Travelers
- Members
- Invitations

## Layer 3 — Supabase Realtime

Realtime is for invalidation only.

```ts
queryClient.invalidateQueries({ queryKey })
```

Realtime must never:

- Patch local React state directly
- Duplicate business logic
- Become a second source of truth
- Write directly to the cache except through invalidation/refetch

---

# 7. Authentication Rules

Use `@supabase/ssr` for all Supabase clients.

## Login only

There is no `/signup` route in V1.

User access can be handled through:

- Existing Supabase Auth users
- Magic link login
- Admin-created users
- Invite-based onboarding handled outside the V1 signup page

## Session refresh

Use `proxy.ts` middleware to refresh session cookies on every request.

On session refresh failure:

1. Clear React Query cache
2. Redirect to `/login`
3. Show toast: `Session expired. Please log in again.`

## Auth boundary

All protected routes must be wrapped by an `AuthBoundary`.

---

# 8. Email Normalization

All emails must be normalized at every entry point.

Normalize on:

- Login form input
- Profile creation trigger
- Invite member RPC input
- Pending invitation matching

Use DB helper:

```sql
CREATE OR REPLACE FUNCTION private.normalize_email(email text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT lower(trim(email));
$$;
```

---

# 9. Roles and Permissions

| Action | Owner | Editor | Viewer |
|---|---:|---:|---:|
| View trip | Yes | Yes | Yes |
| View itinerary | Yes | Yes | Yes |
| Edit itinerary | Yes | Yes | No |
| Add / edit places | Yes | Yes | No |
| Add / edit expenses | Yes | Yes | No |
| Invite members | Yes | No | No |
| Remove members | Yes | No | No |
| Change member roles | Yes | No | No |
| Complete trip | Yes | No | No |
| Archive trip | Yes | No | No |
| Restore archived trip | Yes | No | No |
| Soft delete trip | Yes | No | No |
| Transfer ownership | Yes | No | No |
| Leave trip | No | Yes | Yes |

## Viewer UI rule

Viewer must not see mutation controls.

For viewers:

- Hide Add buttons
- Hide Edit buttons
- Hide Delete buttons
- Hide Invite button
- Show read-only badge

---

# 10. Database Tables

All tables should include:

```sql
created_at timestamptz DEFAULT now()
updated_at timestamptz DEFAULT now()
```

where appropriate.

---

## profiles

```sql
id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
email text UNIQUE NOT NULL,
full_name text,
avatar_url text,
created_at timestamptz DEFAULT now(),
updated_at timestamptz DEFAULT now()
```

---

## trips

```sql
id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
owner_id uuid NOT NULL REFERENCES profiles(id),
name text NOT NULL,
start_date date,
end_date date,
default_currency text NOT NULL,
trip_status text NOT NULL DEFAULT 'planning'
  CHECK (trip_status IN ('planning', 'active', 'completed', 'archived')),
deleted_at timestamptz,
deleted_by uuid REFERENCES profiles(id),
created_at timestamptz DEFAULT now(),
updated_at timestamptz DEFAULT now()
```

## Trip lifecycle

```txt
planning → active → completed → archived
```

Use `deleted_at` only for soft delete / trash.

Do not use `deleted_at` to mean completed.

---

## trip_members

```sql
id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
trip_id uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
role text NOT NULL CHECK (role IN ('owner', 'editor', 'viewer')),
created_at timestamptz DEFAULT now(),
UNIQUE (trip_id, user_id)
```

Rule:

When a trip is created, insert the owner into `trip_members` automatically.

---

## trip_invitations

```sql
id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
trip_id uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
invited_email text NOT NULL,
role text NOT NULL CHECK (role IN ('editor', 'viewer')),
invited_by uuid NOT NULL REFERENCES profiles(id),
status text NOT NULL DEFAULT 'pending'
  CHECK (status IN ('pending', 'accepted', 'cancelled')),
accepted_at timestamptz,
created_at timestamptz DEFAULT now(),
UNIQUE (trip_id, invited_email)
```

---

## travelers

```sql
id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
trip_id uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
name text NOT NULL,
deleted_at timestamptz,
deleted_by uuid REFERENCES profiles(id),
created_at timestamptz DEFAULT now(),
updated_at timestamptz DEFAULT now()
```

Travelers are trip participants used for planning and expense splitting.
They do not need to be app users.

---

## trip_days

```sql
id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
trip_id uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
date date NOT NULL,
day_number integer,
route text,
hotel_name text,
hotel_link text,
remark text,
created_at timestamptz DEFAULT now(),
updated_at timestamptz DEFAULT now(),
UNIQUE (trip_id, date)
```

---

## schedule_items

```sql
id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
trip_id uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
trip_day_id uuid NOT NULL REFERENCES trip_days(id) ON DELETE CASCADE,
time_block text,
title text NOT NULL,
description text,
transport text,
food text,
notes text,
sort_order integer DEFAULT 0,
created_at timestamptz DEFAULT now(),
updated_at timestamptz DEFAULT now()
```

---

## places

```sql
id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
trip_id uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
name text NOT NULL,
type text NOT NULL CHECK (type IN ('food', 'hotel', 'attraction', 'shopping', 'transport')),
area text,
google_map_link text,
notes text,
priority text CHECK (priority IN ('must-go', 'nice-to-have', 'skip')),
rating numeric(2,1),
deleted_at timestamptz,
deleted_by uuid REFERENCES profiles(id),
created_at timestamptz DEFAULT now(),
updated_at timestamptz DEFAULT now()
```

---

## trip_expenses

```sql
id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
trip_id uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
category text,
expense_name text NOT NULL,
currency text NOT NULL,
total_amount numeric(12,2) NOT NULL CHECK (total_amount >= 0),
paid_by_traveler_id uuid REFERENCES travelers(id),
deleted_at timestamptz,
deleted_by uuid REFERENCES profiles(id),
created_at timestamptz DEFAULT now(),
updated_at timestamptz DEFAULT now()
```

---

## expense_splits

```sql
id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
trip_id uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
trip_expense_id uuid NOT NULL REFERENCES trip_expenses(id) ON DELETE CASCADE,
traveler_id uuid NOT NULL REFERENCES travelers(id) ON DELETE CASCADE,
amount numeric(12,2) NOT NULL CHECK (amount >= 0),
created_at timestamptz DEFAULT now(),
UNIQUE (trip_expense_id, traveler_id)
```

---

# 11. Currency Rules

Supported currencies:

```txt
MYR | SGD | USD | VND | THB | IDR | PHP | JPY | KRW | TWD | HKD
```

No currency conversion in V1.

Expense totals must be grouped by currency.

---

# 12. Database Integrity Trigger

Use a trigger to ensure expense splits belong to the same trip as their parent expense and traveler.

```sql
CREATE OR REPLACE FUNCTION validate_expense_split_trip_integrity()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  expense_trip_id uuid;
  traveler_trip_id uuid;
BEGIN
  SELECT trip_id INTO expense_trip_id
  FROM trip_expenses
  WHERE id = NEW.trip_expense_id;

  SELECT trip_id INTO traveler_trip_id
  FROM travelers
  WHERE id = NEW.traveler_id;

  IF NEW.trip_id != expense_trip_id THEN
    RAISE EXCEPTION 'expense_split.trip_id does not match parent expense trip_id';
  END IF;

  IF NEW.trip_id != traveler_trip_id THEN
    RAISE EXCEPTION 'expense_split.trip_id does not match traveler trip_id';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER check_expense_split_integrity
  BEFORE INSERT OR UPDATE ON expense_splits
  FOR EACH ROW
  EXECUTE FUNCTION validate_expense_split_trip_integrity();
```

---

# 13. RLS Helper Functions

Place helper functions in the `private` schema.

Do not expose them through PostgREST.

```sql
CREATE SCHEMA IF NOT EXISTS private;

CREATE OR REPLACE FUNCTION private.is_trip_member(p_trip_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM trip_members
    WHERE trip_id = p_trip_id
      AND user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION private.is_trip_owner(p_trip_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM trip_members
    WHERE trip_id = p_trip_id
      AND user_id = auth.uid()
      AND role = 'owner'
  );
$$;

CREATE OR REPLACE FUNCTION private.can_edit_trip(p_trip_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM trip_members
    WHERE trip_id = p_trip_id
      AND user_id = auth.uid()
      AND role IN ('owner', 'editor')
  );
$$;
```

---

# 14. RLS Policy Pattern

Every trip-scoped table must use trip membership as the read gate.

Example:

```sql
CREATE POLICY "members can view active places"
ON places
FOR SELECT
USING (
  private.is_trip_member(trip_id)
  AND deleted_at IS NULL
);
```

Mutation example:

```sql
CREATE POLICY "owners and editors can insert places"
ON places
FOR INSERT
WITH CHECK (
  private.can_edit_trip(trip_id)
);
```

Owner-only example:

```sql
CREATE POLICY "owners can update trips"
ON trips
FOR UPDATE
USING (
  private.is_trip_owner(id)
)
WITH CHECK (
  private.is_trip_owner(id)
);
```

---

# 15. Required RPC Functions

Sensitive mutations must use RPC.

Do not call protected tables directly from client components.

| RPC | Who can call |
|---|---|
| `create_trip` | Authenticated user |
| `update_trip` | Owner |
| `complete_trip` | Owner |
| `archive_trip` | Owner |
| `restore_archived_trip` | Owner |
| `soft_delete_trip` | Owner |
| `restore_deleted_trip` | Owner |
| `transfer_trip_ownership` | Owner |
| `leave_trip` | Editor / Viewer |
| `invite_trip_member` | Owner |
| `remove_trip_member` | Owner |
| `update_trip_member_role` | Owner |
| `accept_pending_invitations` | System / trigger |
| `create_place` | Owner / Editor |
| `update_place` | Owner / Editor |
| `soft_delete_place` | Owner / Editor |
| `restore_place` | Owner / Editor |
| `create_expense` | Owner / Editor |
| `update_expense` | Owner / Editor |
| `soft_delete_expense` | Owner / Editor |
| `restore_expense` | Owner / Editor |

---

# 16. Invitation Flow

1. Owner clicks Invite in Trip Layout.
2. Owner enters email and role: `editor` or `viewer`.
3. App calls `invite_trip_member(trip_id, email, role)` RPC.
4. Email is normalized using `private.normalize_email()`.
5. If user profile already exists:
   - Insert into `trip_members`.
6. If user profile does not exist:
   - Insert into `trip_invitations` with `status = 'pending'`.
7. When that email later exists as a profile:
   - `accept_pending_invitations()` converts pending invitations into `trip_members` rows.

## Important rule

Invitation grants access only to the invited trip.

Never grant account-wide access.

---

# 17. Expense Logic

## Split modes

### Equal split

Divide total amount by selected travelers.

Rounding rule:

- Round to 2 decimals
- Last traveler absorbs the remainder

### Custom split

User enters exact amounts manually.

Validation rule:

```txt
sum(split_amounts) must equal total_amount
```

Block form submission if the amounts do not match.

---

# 18. Expense Summary Rules

The Expenses page must show:

1. Total expenses by currency
2. Expenses by category
3. Expenses by traveler
4. Paid by traveler
5. Split by traveler
6. Outstanding difference by traveler, if needed

No settlement recording in V1.

If showing outstanding summary, it must be informational only.
Do not create settlement records.

---

# 19. Google Maps Link Helper

When a place has no Google Maps link, auto-generate one.

```ts
export function generateGoogleMapsLink(name: string, area?: string): string {
  const query = encodeURIComponent(`${name} ${area ?? ''}`.trim());
  return `https://www.google.com/maps/search/?api=1&query=${query}`;
}
```

Apply when:

- Creating a place
- Updating a place where `google_map_link` is empty

---

# 20. My Trips Page Spec

Route:

```txt
/trips
```

Purpose:

The My Trips page is the user's private travel workspace dashboard.

It answers:

1. What trips do I own?
2. What trips are shared with me?
3. What trips have I archived?
4. What trip do I want to open or create?

## Required sections

### My Private Trips

Trips where current user is owner.

Show:

- Trip name
- Date range
- Default currency
- Trip status
- Traveler count
- Role badge: Owner
- Privacy badge: Private or Shared
- Quick actions menu

### Shared With Me

Trips where current user is member but not owner.

Show:

- Trip name
- Owner name
- User role: Editor or Viewer
- Date range
- Default currency
- Read-only badge if viewer

### Archived

Trips where:

```txt
trip_status = 'archived'
```

Show:

- Restore button for owner
- Open read-only option

### Trash

Soft-deleted trips where:

```txt
deleted_at IS NOT NULL
```

Show only to owner.

## Required actions

Owner can:

- Create trip
- Open trip
- Edit trip metadata
- Archive trip
- Restore archived trip
- Soft delete trip

Editor can:

- Open shared trip
- Leave trip

Viewer can:

- Open shared trip as read-only
- Leave trip

---

# 21. Trip Layout Spec

Route file:

```txt
/trips/[tripId]/layout.tsx
```

This is not a normal page.
It is the shared shell for every trip page.

## Responsibilities

1. Validate authentication
2. Validate trip membership
3. Load trip metadata
4. Load current user role
5. Render desktop sidebar
6. Render mobile bottom navigation
7. Render trip header
8. Provide permission context
9. Provide realtime subscription provider
10. Handle deleted / archived / permission states

## Desktop navigation

Sidebar items:

1. Overview
2. Trip Plan
3. Places
4. Expenses

Optional owner-only controls:

- Invite members
- Trip settings menu
- Archive trip
- Complete trip

## Mobile navigation

Bottom nav items:

1. Overview
2. Trip Plan
3. Places
4. Expenses

## Header content

Show:

- Trip name
- Date range
- Default currency
- Trip status
- User role badge
- Invite button for owner only

## Access failure states

If user is not a trip member:

- Show `You do not have permission to access this trip.`
- Redirect to `/trips` or show unauthorized screen

If trip is soft deleted:

- Owner can view trash state
- Non-owner should not access

---

# 22. Overview Page Spec

Route:

```txt
/trips/[tripId]/overview
```

Purpose:

The Overview page is the trip command center. It should match the professional planner reference layout:

- Left navigation remains in the shared trip layout.
- Page header shows trip name, date range, destination/route, and owner actions.
- Owner actions appear as top-right controls: Invite Member, Archive, Complete Trip.
- Main content uses a two-column desktop layout: logistics overview on the left, itinerary preview on the right.
- Mobile stacks the same content in order: header, logistics, itinerary preview.

## Desktop layout

Use a professional dashboard layout, not a spreadsheet table.

Left logistics column:

- Logistics Overview heading
- Inbound Flight / arrival route card
- Base Camp / hotel card
- Map preview panel linking to Places
- Invite member form for owners, anchored from the top Invite Member button

Right itinerary column:

- Day sections such as `Day 1: Arrival & Acclimation`
- Date and planned item count per day
- Vertical timeline rail
- Schedule cards showing time, title, notes, type badge, and edit link to Trip Plan
- Empty states for days with no planned items
- Add Itinerary Item link to Trip Plan

## Mobile layout

Use stacked cards with the same information density reduced for mobile.

The mobile view must preserve:

- Trip title and date/location metadata
- Owner actions where allowed
- Logistics cards
- Day itinerary cards
- Link to add or edit itinerary items in Trip Plan

## Trip Plan relationship

The detailed itinerary editor is not the Overview page.

Route:

```txt
/trips/[tripId]/trip-plan
```

Trip Plan owns:

- Add traveler
- Add trip day
- Add schedule item
- Spreadsheet-style desktop itinerary table
- Mobile day cards
- Detailed route, hotel, schedule, transport, food, and notes editing

---

# 23. Places Page Spec

Route:

```txt
/trips/[tripId]/places
```

Purpose:

The Places page is a notebook for food, hotels, attractions, shopping, and transport places.

## Required features

- Add place
- Edit place
- Soft delete place
- Restore place
- Filter by type
- Priority badge
- Rating
- Google Maps link
- Auto-generate Google Maps link when empty

## Place types

```txt
food | hotel | attraction | shopping | transport
```

## Priority values

```txt
must-go | nice-to-have | skip
```

## Desktop layout

Table or card grid.

## Mobile layout

Card list with filter chips.

---

# 24. Expenses Page Spec

Route:

```txt
/trips/[tripId]/expenses
```

Purpose:

The Expenses page tracks trip spending and cost sharing.

## Required features

- Add expense
- Edit expense
- Soft delete expense
- Restore expense
- Equal split
- Custom split
- Category filter
- Currency grouping
- Traveler summary

## Expense table columns

- Expense name
- Category
- Currency
- Amount
- Paid by
- Split method
- Created date
- Actions

## Totals panel

Show:

1. Total by currency
2. Total by category
3. Total paid by traveler
4. Total share by traveler
5. Outstanding difference, informational only

## Important

Do not create settlement flow in V1.

---

# 25. Complete / Archive Trip Flow

Trip status values:

```txt
planning | active | completed | archived
```

## Mark trip complete

Owner-only action.

Before marking complete, show confirmation:

```txt
Mark this trip as completed?
You can still view and archive it later.
```

Optional checklist before complete:

- Trip dates exist
- At least one trip day exists
- Travelers exist
- Expenses reviewed
- Places reviewed

## Archive trip

Owner-only action.

Archived trips:

- Hidden from active trip list
- Shown under Archived tab
- Can be restored by owner
- Are not deleted

## Soft delete trip

Soft delete is different from archive.

Soft-deleted trips:

- Set `deleted_at`
- Set `deleted_by`
- Move to trash
- Can be restored by owner

---

# 26. React Query Pattern

Use a query key factory.

```ts
export const tripKeys = {
  all: ['trips'] as const,
  lists: () => [...tripKeys.all, 'list'] as const,
  list: (filter: string) => [...tripKeys.lists(), filter] as const,
  detail: (tripId: string) => [...tripKeys.all, tripId] as const,
  days: (tripId: string) => [...tripKeys.detail(tripId), 'days'] as const,
  places: (tripId: string) => [...tripKeys.detail(tripId), 'places'] as const,
  expenses: (tripId: string) => [...tripKeys.detail(tripId), 'expenses'] as const,
  travelers: (tripId: string) => [...tripKeys.detail(tripId), 'travelers'] as const,
  members: (tripId: string) => [...tripKeys.detail(tripId), 'members'] as const,
};
```

---

# 27. Realtime Pattern

Use one trip-scoped realtime provider inside Trip Layout.

```ts
supabase
  .channel(`trip:${tripId}`)
  .on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'trip_expenses', filter: `trip_id=eq.${tripId}` },
    () => queryClient.invalidateQueries({ queryKey: tripKeys.expenses(tripId) })
  )
  .on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'places', filter: `trip_id=eq.${tripId}` },
    () => queryClient.invalidateQueries({ queryKey: tripKeys.places(tripId) })
  )
  .subscribe();
```

Do not subscribe globally to all trips.

---

# 28. Server Actions Pattern

Server Actions perform mutations only.

They should call RPC and then allow React Query + Realtime to refetch.

Example:

```ts
'use server';

export async function createExpense(tripId: string, data: CreateExpenseInput) {
  const supabase = createServerClient();

  const { error } = await supabase.rpc('create_expense', {
    p_trip_id: tripId,
    ...data,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/trips/${tripId}/expenses`);
}
```

Do not return final UI state from Server Actions.

---

# 29. UI / UX Rules

## Mobile

- Bottom navigation
- Drawer forms from bottom
- Card lists
- Touch targets at least 44px
- Avoid dense tables on mobile

## Desktop

- Left sidebar
- Sticky headers
- Spreadsheet-style itinerary table
- Inline editing where appropriate
- Horizontal scroll for wide tables

## All viewports

- Loading skeletons
- Empty states with CTA
- Retry button on network failure
- Toast for permission denied
- Toast for session expired
- Clear role badges
- No blank pages

---

# 30. Error Handling Checklist

Always handle:

- Session expired
- RLS denied / Postgres `42501`
- Duplicate invitation
- Network failure
- Supabase downtime
- Split total mismatch
- Deleted trip
- Archived trip
- Viewer attempting mutation
- Editor attempting owner-only action

Recommended messages:

```txt
Session expired. Please log in again.
Permission denied.
User already invited.
Split amounts must equal total amount.
This trip has been archived.
You do not have permission to perform this action.
```

---

# 31. Code Standards

Required:

- TypeScript strict mode
- No `any`
- Zod validation
- React Hook Form
- shadcn/ui components
- Tailwind CSS
- Server Actions for mutations
- React Query for mutable data
- Query key factory
- Utility functions for business logic
- Feature-based components

Forbidden:

- Direct client-side mutation of protected tables
- Realtime local state patching
- Business logic inside UI components
- Duplicate expense calculation logic
- Multiple sources of truth
- Global mutable trip state with Zustand or Redux
- Manual production schema edits
- Exposing Supabase service role key

---

# 32. Testing Priorities

## Playwright E2E must cover

1. Login
2. My Trips loads only accessible trips
3. Create private trip
4. Owner is automatically added to trip members
5. Open trip workspace
6. Add itinerary day / overview data
7. Add place
8. Add expense with equal split
9. Add expense with custom split
10. Viewer cannot mutate
11. Editor cannot archive or delete trip
12. Owner can invite editor
13. Owner can invite viewer
14. Owner can mark trip complete
15. Owner can archive and restore trip
16. Session expiry handling

## Vitest unit tests must cover

- Equal split rounding
- Custom split validation
- Google Maps link generation
- Email normalization
- Permission helper logic
- Trip status transition rules

---

# 33. Migration File Order

```txt
001_schema.sql
002_rls_policies.sql
003_rpc_and_triggers.sql
004_seed_helpers.sql
```

Rules:

- Never edit production schema manually
- Never modify old applied migrations
- Add new numbered migration files for future changes
- Keep dev/staging seed helpers separate from production logic

---

# 34. Seed Data

Dev / staging only.

Create authenticated `create_seed_trip` RPC.

Seed trip:

```txt
Trip: Da Nang Trip
Owner: current authenticated user
Travelers: Julian, Clarrie
Currency: MYR
Places: hotels, food, attractions, airport transfer
Expenses: Flight, Hotel, SIM, Insurance
Status: planning
```

Do not seed anonymous public data.

---

# 35. Deployment Checklist

Environment variables:

```txt
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
NEXT_PUBLIC_SUPABASE_ANON_KEY
```

Never expose:

```txt
SUPABASE_SERVICE_ROLE_KEY
```

CI steps:

```txt
pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm build
supabase db push staging
vercel deploy
```

Environment strategy:

```txt
local → Supabase local Docker
staging → Supabase staging project
production → Supabase production project
```

---

# 36. Response Contract for Codex

When implementing a feature, always return:

1. Summary of what changed
2. Files created or modified
3. Full code
4. Database migration if needed
5. RLS updates if needed
6. RPC updates if needed
7. Type updates if needed
8. Tests added or required
9. Risks or assumptions

When debugging, always return:

1. Root cause
2. Violated rule, if any
3. Minimal safe fix
4. Files to change
5. How to verify

When refactoring, always:

1. Preserve behavior
2. Preserve RLS security
3. Preserve RPC boundaries
4. Preserve React Query ownership
5. Avoid broad rewrites unless requested

---

# 37. Forbidden Anti-Patterns

Never:

- Add signup page unless explicitly requested
- Add settlement page unless explicitly requested
- Treat all users as part of one shared global trip list
- Let one invite expose all owner trips
- Skip RLS because UI already hides buttons
- Directly insert protected rows from browser client
- Patch React Query cache from Realtime events
- Duplicate balance logic in components
- Use deleted records as active data
- Use `deleted_at` to represent completed trips
- Let viewer see mutation controls
- Let editor perform owner-only actions
- Expose service role key
- Add currency conversion in V1

---

# 38. Definition of Done

A task is complete only when:

- TypeScript compiles
- RLS is enforced
- RPC is used for sensitive mutations
- React Query owns mutable data
- Realtime invalidates correctly
- Mobile UX is covered
- Desktop UX is covered
- Loading state exists
- Empty state exists
- Error state exists
- Permission denied state exists
- Tests are added or clearly specified
- No removed V1 feature was reintroduced accidentally

---

# 39. Golden Rule

Travel OS must behave correctly when:

- A user creates a private trip
- Another user is invited to only one trip
- Multiple users edit the same shared trip
- A viewer attempts mutation
- An editor attempts owner-only actions
- A session expires
- A trip is completed
- A trip is archived
- A trip is soft deleted and restored

If an implementation risks breaking privacy, RLS, RPC boundaries, or React Query ownership, redesign it before coding.
