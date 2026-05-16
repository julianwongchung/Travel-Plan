create schema if not exists private;

create or replace function private.normalize_email(email text)
returns text
language sql
immutable
as $$
  select lower(trim(email));
$$;

create or replace function private.is_trip_member(p_trip_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.trip_members
    where trip_id = p_trip_id
      and user_id = auth.uid()
  );
$$;

create or replace function private.is_trip_owner(p_trip_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.trip_members
    where trip_id = p_trip_id
      and user_id = auth.uid()
      and role = 'owner'
  );
$$;

create or replace function private.can_edit_trip(p_trip_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.trip_members
    where trip_id = p_trip_id
      and user_id = auth.uid()
      and role in ('owner','editor')
  );
$$;

alter table public.profiles enable row level security;
alter table public.trips enable row level security;
alter table public.trip_members enable row level security;
alter table public.trip_invitations enable row level security;
alter table public.travelers enable row level security;
alter table public.trip_days enable row level security;
alter table public.schedule_items enable row level security;
alter table public.places enable row level security;
alter table public.trip_expenses enable row level security;
alter table public.expense_splits enable row level security;

create policy profiles_select_related on public.profiles
  for select to authenticated
  using (
    id = auth.uid()
    or exists (
      select 1
      from public.trip_members mine
      join public.trip_members theirs on theirs.trip_id = mine.trip_id
      where mine.user_id = auth.uid()
        and theirs.user_id = profiles.id
    )
  );

create policy profiles_insert_self on public.profiles
  for insert to authenticated
  with check (id = auth.uid());

create policy profiles_update_self on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy trips_select_members on public.trips
  for select to authenticated
  using (private.is_trip_member(id));

create policy trips_insert_owner on public.trips
  for insert to authenticated
  with check (owner_id = auth.uid());

create policy trips_update_owner on public.trips
  for update to authenticated
  using (private.is_trip_owner(id))
  with check (private.is_trip_owner(id));

create policy trip_members_select_members on public.trip_members
  for select to authenticated
  using (private.is_trip_member(trip_id));

create policy trip_members_insert_owner on public.trip_members
  for insert to authenticated
  with check (private.is_trip_owner(trip_id) or user_id = auth.uid());

create policy trip_members_update_owner on public.trip_members
  for update to authenticated
  using (private.is_trip_owner(trip_id))
  with check (private.is_trip_owner(trip_id));

create policy trip_members_delete_owner_or_self on public.trip_members
  for delete to authenticated
  using (private.is_trip_owner(trip_id) or (user_id = auth.uid() and role in ('editor','viewer')));

create policy trip_invitations_select_owner on public.trip_invitations
  for select to authenticated
  using (private.is_trip_owner(trip_id));

create policy trip_invitations_write_owner on public.trip_invitations
  for all to authenticated
  using (private.is_trip_owner(trip_id))
  with check (private.is_trip_owner(trip_id));

create policy travelers_select_members on public.travelers
  for select to authenticated using (private.is_trip_member(trip_id));
create policy travelers_insert_editors on public.travelers
  for insert to authenticated with check (private.can_edit_trip(trip_id));
create policy travelers_update_editors on public.travelers
  for update to authenticated using (private.can_edit_trip(trip_id)) with check (private.can_edit_trip(trip_id));

create policy trip_days_select_members on public.trip_days
  for select to authenticated using (private.is_trip_member(trip_id));
create policy trip_days_insert_editors on public.trip_days
  for insert to authenticated with check (private.can_edit_trip(trip_id));
create policy trip_days_update_editors on public.trip_days
  for update to authenticated using (private.can_edit_trip(trip_id)) with check (private.can_edit_trip(trip_id));

create policy schedule_items_select_members on public.schedule_items
  for select to authenticated using (private.is_trip_member(trip_id));
create policy schedule_items_insert_editors on public.schedule_items
  for insert to authenticated with check (private.can_edit_trip(trip_id));
create policy schedule_items_update_editors on public.schedule_items
  for update to authenticated using (private.can_edit_trip(trip_id)) with check (private.can_edit_trip(trip_id));

create policy places_select_members on public.places
  for select to authenticated using (private.is_trip_member(trip_id));
create policy places_insert_editors on public.places
  for insert to authenticated with check (private.can_edit_trip(trip_id));
create policy places_update_editors on public.places
  for update to authenticated using (private.can_edit_trip(trip_id)) with check (private.can_edit_trip(trip_id));

create policy trip_expenses_select_members on public.trip_expenses
  for select to authenticated using (private.is_trip_member(trip_id));
create policy trip_expenses_insert_editors on public.trip_expenses
  for insert to authenticated with check (private.can_edit_trip(trip_id));
create policy trip_expenses_update_editors on public.trip_expenses
  for update to authenticated using (private.can_edit_trip(trip_id)) with check (private.can_edit_trip(trip_id));

create policy expense_splits_select_members on public.expense_splits
  for select to authenticated using (private.is_trip_member(trip_id));
create policy expense_splits_insert_editors on public.expense_splits
  for insert to authenticated with check (private.can_edit_trip(trip_id));
create policy expense_splits_update_editors on public.expense_splits
  for update to authenticated using (private.can_edit_trip(trip_id)) with check (private.can_edit_trip(trip_id));
