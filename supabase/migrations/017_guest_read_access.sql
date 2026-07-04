grant select on table
  public.trips,
  public.trip_days,
  public.schedule_items,
  public.places,
  public.trip_expenses,
  public.expense_splits,
  public.travelers
to anon, authenticated;

drop policy if exists trips_select_guest_read on public.trips;
create policy trips_select_guest_read
  on public.trips for select
  to anon, authenticated
  using (deleted_at is null);

drop policy if exists trip_days_select_guest_read on public.trip_days;
create policy trip_days_select_guest_read
  on public.trip_days for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.trips
      where trips.id = trip_days.trip_id
        and trips.deleted_at is null
    )
  );

drop policy if exists schedule_items_select_guest_read on public.schedule_items;
create policy schedule_items_select_guest_read
  on public.schedule_items for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.trips
      where trips.id = schedule_items.trip_id
        and trips.deleted_at is null
    )
  );

drop policy if exists places_select_guest_read on public.places;
create policy places_select_guest_read
  on public.places for select
  to anon, authenticated
  using (
    deleted_at is null
    and exists (
      select 1
      from public.trips
      where trips.id = places.trip_id
        and trips.deleted_at is null
    )
  );

drop policy if exists travelers_select_guest_read on public.travelers;
create policy travelers_select_guest_read
  on public.travelers for select
  to anon, authenticated
  using (
    deleted_at is null
    and exists (
      select 1
      from public.trips
      where trips.id = travelers.trip_id
        and trips.deleted_at is null
    )
  );

drop policy if exists trip_expenses_select_guest_read on public.trip_expenses;
create policy trip_expenses_select_guest_read
  on public.trip_expenses for select
  to anon, authenticated
  using (
    deleted_at is null
    and exists (
      select 1
      from public.trips
      where trips.id = trip_expenses.trip_id
        and trips.deleted_at is null
    )
  );

drop policy if exists expense_splits_select_guest_read on public.expense_splits;
create policy expense_splits_select_guest_read
  on public.expense_splits for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.trips
      where trips.id = expense_splits.trip_id
        and trips.deleted_at is null
    )
  );

do $$
begin
  if to_regclass('public.trip_hotels') is not null then
    grant select on table public.trip_hotels to anon, authenticated;

    drop policy if exists trip_hotels_select_guest_read on public.trip_hotels;
    create policy trip_hotels_select_guest_read
      on public.trip_hotels for select
      to anon, authenticated
      using (
        deleted_at is null
        and exists (
          select 1
          from public.trips
          where trips.id = trip_hotels.trip_id
            and trips.deleted_at is null
        )
      );
  end if;
end $$;

do $$
begin
  if to_regclass('public.trip_flights') is not null then
    grant select on table public.trip_flights to anon, authenticated;

    drop policy if exists trip_flights_select_guest_read on public.trip_flights;
    create policy trip_flights_select_guest_read
      on public.trip_flights for select
      to anon, authenticated
      using (
        deleted_at is null
        and exists (
          select 1
          from public.trips
          where trips.id = trip_flights.trip_id
            and trips.deleted_at is null
        )
      );
  end if;
end $$;
