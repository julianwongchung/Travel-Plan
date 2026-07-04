alter table public.profiles
  drop constraint if exists profiles_app_role_check;

alter table public.profiles
  add constraint profiles_app_role_check check (app_role in ('admin', 'viewer', 'guest'));

create or replace function private.is_app_guest()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and app_role = 'guest'
      and is_active = true
  );
$$;

create or replace function private.can_view_trip(p_trip_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select private.is_active_app_user()
    and exists (
      select 1
      from public.trips
      where trips.id = p_trip_id
        and (
          private.is_app_admin()
          or (
            trips.deleted_at is null
            and (
              private.is_app_guest()
              or exists (
                select 1
                from public.trip_members
                where trip_id = p_trip_id
                  and user_id = auth.uid()
              )
            )
          )
        )
    );
$$;

create or replace function public.get_trip_cards()
returns table (
  id uuid,
  owner_id uuid,
  name text,
  start_date date,
  end_date date,
  default_currency text,
  trip_status text,
  deleted_at timestamptz,
  deleted_by uuid,
  created_at timestamptz,
  updated_at timestamptz,
  role text,
  owner_email text,
  traveler_count bigint,
  member_count bigint
)
language sql
security definer
set search_path = public, private
as $$
  select
    trips.id,
    trips.owner_id,
    trips.name,
    trips.start_date,
    trips.end_date,
    trips.default_currency,
    trips.trip_status,
    trips.deleted_at,
    trips.deleted_by,
    trips.created_at,
    trips.updated_at,
    case
      when private.is_app_admin() then 'owner'
      when private.is_app_guest() then 'viewer'
      else coalesce(my_membership.role, case when trips.owner_id = auth.uid() then 'owner' end)
    end as role,
    owners.email as owner_email,
    coalesce(traveler_counts.traveler_count, 0) as traveler_count,
    coalesce(member_counts.member_count, 0) as member_count
  from public.trips
  left join public.trip_members my_membership
    on my_membership.trip_id = trips.id
   and my_membership.user_id = auth.uid()
  left join public.profiles owners
    on owners.id = trips.owner_id
  left join (
    select trip_id, count(*) as traveler_count
    from public.travelers
    where deleted_at is null
    group by trip_id
  ) traveler_counts on traveler_counts.trip_id = trips.id
  left join (
    select trip_id, count(*) as member_count
    from public.trip_members
    group by trip_id
  ) member_counts on member_counts.trip_id = trips.id
  where private.is_active_app_user()
    and (
      private.is_app_admin()
      or (private.is_app_guest() and trips.deleted_at is null)
      or my_membership.user_id = auth.uid()
    )
  order by trips.created_at desc;
$$;

revoke select on table
  public.trips,
  public.trip_days,
  public.schedule_items,
  public.places,
  public.trip_expenses,
  public.expense_splits,
  public.travelers
from anon;

drop policy if exists trips_select_guest_read on public.trips;
create policy trips_select_guest_read
  on public.trips for select
  to authenticated
  using (private.can_view_trip(id));

drop policy if exists trip_days_select_guest_read on public.trip_days;
create policy trip_days_select_guest_read
  on public.trip_days for select
  to authenticated
  using (private.can_view_trip(trip_id));

drop policy if exists schedule_items_select_guest_read on public.schedule_items;
create policy schedule_items_select_guest_read
  on public.schedule_items for select
  to authenticated
  using (private.can_view_trip(trip_id));

drop policy if exists places_select_guest_read on public.places;
create policy places_select_guest_read
  on public.places for select
  to authenticated
  using (deleted_at is null and private.can_view_trip(trip_id));

drop policy if exists travelers_select_guest_read on public.travelers;
create policy travelers_select_guest_read
  on public.travelers for select
  to authenticated
  using (deleted_at is null and private.can_view_trip(trip_id));

drop policy if exists trip_expenses_select_guest_read on public.trip_expenses;
create policy trip_expenses_select_guest_read
  on public.trip_expenses for select
  to authenticated
  using (deleted_at is null and private.can_view_trip(trip_id));

drop policy if exists expense_splits_select_guest_read on public.expense_splits;
create policy expense_splits_select_guest_read
  on public.expense_splits for select
  to authenticated
  using (private.can_view_trip(trip_id));

do $$
begin
  if to_regclass('public.trip_hotels') is not null then
    revoke select on table public.trip_hotels from anon;

    drop policy if exists trip_hotels_select_guest_read on public.trip_hotels;
    create policy trip_hotels_select_guest_read
      on public.trip_hotels for select
      to authenticated
      using (deleted_at is null and private.can_view_trip(trip_id));
  end if;
end $$;

do $$
begin
  if to_regclass('public.trip_flights') is not null then
    revoke select on table public.trip_flights from anon;

    drop policy if exists trip_flights_select_guest_read on public.trip_flights;
    create policy trip_flights_select_guest_read
      on public.trip_flights for select
      to authenticated
      using (deleted_at is null and private.can_view_trip(trip_id));
  end if;
end $$;

grant execute on function private.is_app_guest() to authenticated;
grant execute on function private.can_view_trip(uuid) to authenticated;
grant execute on function public.get_trip_cards() to authenticated;
