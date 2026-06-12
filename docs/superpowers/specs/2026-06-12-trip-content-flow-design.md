# Trip Content Flow Design

## Goal

Make Overview a read-only trip summary, make Places the only location for
creating hotels and flights, and move owner invitation and archive actions to
the Trips page without changing authentication or existing trip behavior.

## Scope

This design changes:

- `/trips`
- `/trips/[tripId]/overview`
- `/trips/[tripId]/places`
- Hotel and flight persistence, queries, RPCs, RLS, and tests

It does not change:

- Authentication or session handling
- Trip membership roles
- Existing itinerary, expense, or place records
- Existing invite or archive business rules
- The trip date/day generation behavior
- The database meaning of existing `places` rows

## Data Model

Add two trip-scoped tables through a numbered Supabase migration.

### `trip_hotels`

- `id uuid primary key`
- `trip_id uuid not null`
- `name text not null`
- `location text not null`
- `check_in_date date not null`
- `check_out_date date not null`
- `notes text`
- `created_by uuid not null`
- `created_at timestamptz not null default now()`
- `deleted_at timestamptz`
- `deleted_by uuid`

Validation requires `check_out_date >= check_in_date`.

### `trip_flights`

- `id uuid primary key`
- `trip_id uuid not null`
- `flight_number text not null`
- `flight_date date not null`
- `flight_time time not null`
- `passenger_name text not null`
- `departure text not null`
- `arrival text not null`
- `notes text`
- `created_by uuid not null`
- `created_at timestamptz not null default now()`
- `deleted_at timestamptz`
- `deleted_by uuid`

Hotels and flights use separate tables instead of adding unrelated nullable
columns to `places`. Existing `places` records remain untouched.

Add nullable `planned_date date` and `planned_time time` columns to `places`
for the requested optional Place date/time fields. Existing rows keep null
values and require no data migration.

Existing active `places` rows whose type is `hotel` are included as legacy
hotel summary entries. Their location comes from `area`, their notes remain
visible, and unavailable check-in/check-out values display as `Not set`.
Legacy hotel rows are not copied into `trip_hotels`, preventing duplicate
records after refresh.

## Permissions And Mutations

All new tables use RLS:

- Trip members can select active records.
- Owners and editors can create records.
- Owners and editors can update or soft-delete records.
- Viewers cannot see mutation controls and cannot mutate through direct calls.

Protected writes use security-definer RPCs following the repository's current
action pattern:

- `create_trip_hotel`
- `create_trip_flight`
- `update_trip_hotel`
- `update_trip_flight`
- `soft_delete_trip_hotel`
- `soft_delete_trip_flight`

RPCs verify membership with `private.can_edit_trip`. Client components call
Server Actions, and React Query remains the mutable-data owner. Realtime may
invalidate query keys but must not patch cached data directly.

## Overview Page

Overview contains no itinerary creation control and no hotel/flight mutation
control.

Two summary cards appear at the top:

### Hotels

The card displays:

- Total active structured and legacy hotel count
- Current hotel when today falls within a stay
- Otherwise the next hotel by check-in date
- The selected hotel's stay date range
- `Not set` for legacy dates

Selecting the card opens a responsive details surface:

- Bottom sheet on mobile
- Centered modal or sheet on larger screens

The details surface lists every hotel with name, location, check-in,
check-out, and notes. It is read-only.

### Flights

The card displays:

- Total active flight count
- Next flight date/time
- Passenger/person name

The next flight is the earliest flight whose local date/time is not in the
past. If every flight is past, the most recent flight is displayed.

Selecting the card opens a read-only responsive details surface listing flight
number, date/time, passenger, departure, arrival, and notes.

### Empty State

When a category has no records, its card shows `Add in Places`. The action
navigates to `/trips/[tripId]/places` and does not open a form on Overview.

The remaining Overview content is summary information only. Existing
itinerary content that belongs to the Plan experience is not duplicated as an
editable Overview workflow.

## Places Page

The page header includes one compact `+ Add` button for owners and editors.
Viewers do not see it.

Selecting it opens a bottom sheet/menu with:

- Add Hotel
- Add Flight
- Add Place

Selecting an option replaces the menu with the matching form in the same
responsive sheet. Forms use React Hook Form and Zod.

### Add Hotel

Fields:

- Hotel name
- Location/address
- Check-in date
- Check-out date
- Notes

The form rejects a check-out date before check-in.

### Add Flight

Fields:

- Flight number
- Flight date
- Flight time
- Passenger/person name
- Departure
- Arrival
- Notes

### Add Place

Fields:

- Place name
- Location/address
- Optional date
- Optional time
- Notes

The existing place creation behavior remains available. Optional date/time is
stored in the new nullable `places.planned_date` and `places.planned_time`
columns.

After a successful mutation, the sheet closes, the relevant query is
invalidated, and the new card appears. Errors remain in the sheet with a clear
retryable message.

The Places list groups or labels Hotels, Flights, and Places clearly while
retaining existing filters, edit, delete, restore, and Google Maps behavior.

## Plan Page

The Plan page remains the itinerary sequencing workspace. It must not expose
Hotel or Flight record forms or call the new hotel/flight creation RPCs.
Existing itinerary add, edit, delete, and drag-and-drop behavior remains
unchanged.

## Trips Page

Owned trip cards contain:

- `Open` as the full-width primary action
- `Invite People` as a secondary action
- `Archive` as a compact secondary/destructive action

`Invite People` opens the existing invite workflow in a bottom sheet directly
on `/trips`. It reuses existing invitation actions and validation.

`Archive` reuses the existing owner-only confirmation and archive mutation.

Shared trip cards do not show owner-only Invite or Archive actions. Existing
restore behavior for archived trips remains unchanged.

Owner actions are removed from Overview after their Trips-page equivalents are
available. Complete Trip remains on Overview because this request only moves
Invite and Archive.

## Responsive And Visual Behavior

The implementation extends the existing iOS-inspired Liquid Glass system:

- 20–28px card radii
- Readable opaque or lightly translucent main content
- Glass treatment for sheets, menus, and floating controls
- 44px minimum touch targets
- Compact icon buttons with accessible labels
- Single-column mobile cards
- Balanced constrained desktop content
- Safe-area padding for mobile bottom sheets and navigation
- No horizontal page scrolling
- Wrapped long names, locations, notes, and flight routes
- Reduced-transparency fallback

## Query Ownership

Add React Query keys for hotels and flights. Overview may use a composed query
that returns structured hotels, legacy hotel Places, and flights, but each
mutable resource keeps a stable resource-specific query key for invalidation.

Server Components continue to provide access-validated shells. Mutable lists
and sheet forms use React Query and Server Actions.

## Error And Empty States

- Permission failures show the existing permission-denied toast.
- Session expiry follows the existing redirect and cache-clear behavior.
- Network failures preserve form values and allow retry.
- Empty hotel and flight summaries link to Places.
- Legacy hotel dates display `Not set`; they are never invented.
- Soft-deleted records do not appear in active summary counts.

## Testing

Unit tests cover:

- Hotel current/next selection
- Flight next/recent selection
- Legacy hotel normalization
- Hotel date validation
- Flight validation
- Permission-based action visibility
- Overview empty-state links
- Places add-option routing

Integration/component tests cover:

- Overview has no Add Itinerary button
- Summary cards open read-only details
- Places opens each form from `+ Add`
- Successful form submissions invalidate the correct query
- Viewer mutation controls remain hidden
- Trips cards show owner actions and preserve Open as primary
- Invite opens from the Trips page
- Archive uses the existing mutation
- Plan exposes no Hotel or Flight creation form

Migration verification covers RLS membership reads and owner/editor/viewer
mutation boundaries. Lint, typecheck, unit tests, and production build run
before completion.

## Compatibility And Rollout

The migration is additive. It does not transform or delete existing rows.
Existing hotel Places remain visible through a normalized read model, so the
new Overview does not hide existing hotel information.

The migration file will be created locally but not applied to a hosted
Supabase project without explicit approval.
