alter table public.places
  add column if not exists planned_date date,
  add column if not exists planned_time time;

drop function if exists public.create_place(uuid, text, text, text, text, text, text, numeric);
create function public.create_place(
  p_trip_id uuid,
  p_name text,
  p_type text,
  p_area text,
  p_google_map_link text,
  p_notes text,
  p_priority text,
  p_rating numeric,
  p_planned_date date,
  p_planned_time time
)
returns uuid
language plpgsql
security definer
set search_path = public, private
as $$
declare new_place_id uuid;
begin
  if not private.can_edit_trip(p_trip_id) then
    raise exception 'You do not have permission to create places';
  end if;
  insert into public.places (
    trip_id, name, type, area, google_map_link, notes, priority, rating,
    planned_date, planned_time
  )
  values (
    p_trip_id, trim(p_name), p_type, p_area,
    coalesce(nullif(p_google_map_link, ''), public.google_maps_link(p_name, p_area)),
    p_notes, p_priority, p_rating, p_planned_date, p_planned_time
  )
  returning id into new_place_id;
  return new_place_id;
end;
$$;

create table if not exists public.trip_hotels (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  name text not null,
  location text not null,
  check_in_date date not null,
  check_out_date date not null,
  notes text,
  created_by uuid not null references public.profiles(id),
  deleted_at timestamptz,
  deleted_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  constraint trip_hotels_valid_stay check (check_out_date >= check_in_date)
);

create table if not exists public.trip_flights (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  flight_number text not null,
  flight_date date not null,
  flight_time time not null,
  passenger_name text not null,
  departure text not null,
  arrival text not null,
  notes text,
  created_by uuid not null references public.profiles(id),
  deleted_at timestamptz,
  deleted_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create index if not exists trip_hotels_trip_dates_idx
  on public.trip_hotels(trip_id, check_in_date, check_out_date)
  where deleted_at is null;

create index if not exists trip_flights_trip_departure_idx
  on public.trip_flights(trip_id, flight_date, flight_time)
  where deleted_at is null;

alter table public.trip_hotels enable row level security;
alter table public.trip_flights enable row level security;

grant select, insert, update on table public.trip_hotels to authenticated;
grant select, insert, update on table public.trip_flights to authenticated;

drop policy if exists "members can view trip hotels" on public.trip_hotels;
create policy "members can view trip hotels"
  on public.trip_hotels for select
  using (private.is_trip_member(trip_id));

drop policy if exists "editors can create trip hotels" on public.trip_hotels;
create policy "editors can create trip hotels"
  on public.trip_hotels for insert
  with check (private.can_edit_trip(trip_id) and created_by = auth.uid());

drop policy if exists "editors can update trip hotels" on public.trip_hotels;
create policy "editors can update trip hotels"
  on public.trip_hotels for update
  using (private.can_edit_trip(trip_id))
  with check (private.can_edit_trip(trip_id));

drop policy if exists "members can view trip flights" on public.trip_flights;
create policy "members can view trip flights"
  on public.trip_flights for select
  using (private.is_trip_member(trip_id));

drop policy if exists "editors can create trip flights" on public.trip_flights;
create policy "editors can create trip flights"
  on public.trip_flights for insert
  with check (private.can_edit_trip(trip_id) and created_by = auth.uid());

drop policy if exists "editors can update trip flights" on public.trip_flights;
create policy "editors can update trip flights"
  on public.trip_flights for update
  using (private.can_edit_trip(trip_id))
  with check (private.can_edit_trip(trip_id));

create or replace function public.create_trip_hotel(
  p_trip_id uuid,
  p_name text,
  p_location text,
  p_check_in_date date,
  p_check_out_date date,
  p_notes text
)
returns uuid
language plpgsql
security definer
set search_path = public, private
as $$
declare new_hotel_id uuid;
begin
  if not private.can_edit_trip(p_trip_id) then
    raise exception 'You do not have permission to create hotels';
  end if;
  if p_check_out_date < p_check_in_date then
    raise exception 'Check-out date must be on or after check-in date';
  end if;

  insert into public.trip_hotels (
    trip_id, name, location, check_in_date, check_out_date, notes, created_by
  )
  values (
    p_trip_id, trim(p_name), trim(p_location), p_check_in_date, p_check_out_date, nullif(trim(p_notes), ''), auth.uid()
  )
  returning id into new_hotel_id;
  return new_hotel_id;
end;
$$;

create or replace function public.create_trip_flight(
  p_trip_id uuid,
  p_flight_number text,
  p_flight_date date,
  p_flight_time time,
  p_passenger_name text,
  p_departure text,
  p_arrival text,
  p_notes text
)
returns uuid
language plpgsql
security definer
set search_path = public, private
as $$
declare new_flight_id uuid;
begin
  if not private.can_edit_trip(p_trip_id) then
    raise exception 'You do not have permission to create flights';
  end if;

  insert into public.trip_flights (
    trip_id, flight_number, flight_date, flight_time, passenger_name,
    departure, arrival, notes, created_by
  )
  values (
    p_trip_id, upper(trim(p_flight_number)), p_flight_date, p_flight_time,
    trim(p_passenger_name), trim(p_departure), trim(p_arrival),
    nullif(trim(p_notes), ''), auth.uid()
  )
  returning id into new_flight_id;
  return new_flight_id;
end;
$$;

create or replace function public.soft_delete_trip_hotel(p_hotel_id uuid)
returns void
language plpgsql
security definer
set search_path = public, private
as $$
declare parent_trip_id uuid;
begin
  select trip_id into parent_trip_id from public.trip_hotels where id = p_hotel_id;
  if parent_trip_id is null or not private.can_edit_trip(parent_trip_id) then
    raise exception 'You do not have permission to delete hotels';
  end if;
  update public.trip_hotels
  set deleted_at = now(), deleted_by = auth.uid(), updated_at = now()
  where id = p_hotel_id;
end;
$$;

create or replace function public.soft_delete_trip_flight(p_flight_id uuid)
returns void
language plpgsql
security definer
set search_path = public, private
as $$
declare parent_trip_id uuid;
begin
  select trip_id into parent_trip_id from public.trip_flights where id = p_flight_id;
  if parent_trip_id is null or not private.can_edit_trip(parent_trip_id) then
    raise exception 'You do not have permission to delete flights';
  end if;
  update public.trip_flights
  set deleted_at = now(), deleted_by = auth.uid(), updated_at = now()
  where id = p_flight_id;
end;
$$;

revoke all on function public.create_trip_hotel(uuid, text, text, date, date, text) from public;
revoke all on function public.create_trip_flight(uuid, text, date, time, text, text, text, text) from public;
revoke all on function public.soft_delete_trip_hotel(uuid) from public;
revoke all on function public.soft_delete_trip_flight(uuid) from public;

grant execute on function public.create_trip_hotel(uuid, text, text, date, date, text) to authenticated;
grant execute on function public.create_trip_flight(uuid, text, date, time, text, text, text, text) to authenticated;
grant execute on function public.soft_delete_trip_hotel(uuid) to authenticated;
grant execute on function public.soft_delete_trip_flight(uuid) to authenticated;
grant execute on function public.create_place(uuid, text, text, text, text, text, text, numeric, date, time) to authenticated;
