create or replace function private.sync_trip_days(
  p_trip_id uuid,
  p_start_date date,
  p_end_date date
)
returns void
language plpgsql
security definer
set search_path = public, private
as $$
begin
  if p_start_date is null then
    return;
  end if;

  if p_end_date is not null and p_end_date < p_start_date then
    raise exception 'Trip end date must be on or after start date';
  end if;

  insert into public.trip_days (trip_id, date, day_number)
  select
    p_trip_id,
    generated_day::date,
    row_number() over (order by generated_day)::integer
  from generate_series(
    p_start_date,
    coalesce(p_end_date, p_start_date),
    interval '1 day'
  ) as generated_days(generated_day)
  on conflict (trip_id, date) do update
  set
    day_number = excluded.day_number,
    updated_at = now();
end;
$$;

revoke all on function private.sync_trip_days(uuid, date, date) from public;

create or replace function public.create_trip(
  p_name text,
  p_start_date date default null,
  p_end_date date default null,
  p_default_currency text default 'MYR'
)
returns uuid
language plpgsql
security definer
set search_path = public, private
as $$
declare
  new_trip_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if p_start_date is not null and p_end_date is not null and p_end_date < p_start_date then
    raise exception 'Trip end date must be on or after start date';
  end if;

  insert into public.trips (owner_id, name, start_date, end_date, default_currency)
  values (auth.uid(), p_name, p_start_date, p_end_date, p_default_currency)
  returning id into new_trip_id;

  insert into public.trip_members (trip_id, user_id, role)
  values (new_trip_id, auth.uid(), 'owner');

  perform private.sync_trip_days(new_trip_id, p_start_date, p_end_date);

  return new_trip_id;
end;
$$;

create or replace function public.update_trip(
  p_trip_id uuid,
  p_name text,
  p_start_date date,
  p_end_date date,
  p_default_currency text
)
returns void
language plpgsql
security definer
set search_path = public, private
as $$
begin
  if not private.is_trip_owner(p_trip_id) then
    raise exception 'Only the trip owner can update trip metadata';
  end if;

  if p_start_date is null or p_end_date is null then
    raise exception 'Trip start and end dates are required';
  end if;

  if p_end_date < p_start_date then
    raise exception 'Trip end date must be on or after start date';
  end if;

  update public.trips
  set
    name = p_name,
    start_date = p_start_date,
    end_date = p_end_date,
    default_currency = p_default_currency,
    updated_at = now()
  where id = p_trip_id;

  perform private.sync_trip_days(p_trip_id, p_start_date, p_end_date);
end;
$$;

select private.sync_trip_days(id, start_date, end_date)
from public.trips
where start_date is not null;

create or replace function public.create_seed_trip()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  seed_trip_id uuid;
  julian_id uuid;
  clarrie_id uuid;
  day_id uuid;
  expense_id uuid;
begin
  seed_trip_id := public.create_trip('Da Nang Trip', current_date + 30, current_date + 34, 'MYR');

  insert into public.travelers (trip_id, name) values (seed_trip_id, 'Julian') returning id into julian_id;
  insert into public.travelers (trip_id, name) values (seed_trip_id, 'Clarrie') returning id into clarrie_id;

  select id into day_id
  from public.trip_days
  where trip_id = seed_trip_id and date = current_date + 30;

  update public.trip_days
  set route = 'Airport to My Khe Beach', hotel_name = 'Beachside hotel'
  where id = day_id;

  insert into public.schedule_items (trip_id, trip_day_id, time_block, title, transport, food, sort_order)
  values (seed_trip_id, day_id, 'Afternoon', 'Arrive and check in', 'Airport transfer', 'Seafood dinner', 1);

  insert into public.places (trip_id, name, type, area, google_map_link, notes, priority, rating)
  values
    (seed_trip_id, 'My Khe Beach', 'attraction', 'Da Nang', public.google_maps_link('My Khe Beach', 'Da Nang'), 'Easy first-day stop.', 'must-go', 4.7),
    (seed_trip_id, 'Han Market', 'shopping', 'Da Nang', public.google_maps_link('Han Market', 'Da Nang'), 'Good for snacks and souvenirs.', 'nice-to-have', 4.2);

  insert into public.trip_expenses (trip_id, category, expense_name, currency, total_amount, paid_by_traveler_id)
  values (seed_trip_id, 'Flight', 'Flight tickets', 'MYR', 900, julian_id)
  returning id into expense_id;

  insert into public.expense_splits (trip_id, trip_expense_id, traveler_id, amount)
  values (seed_trip_id, expense_id, julian_id, 450), (seed_trip_id, expense_id, clarrie_id, 450);

  return seed_trip_id;
end;
$$;
