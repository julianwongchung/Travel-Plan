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
    join public.trips
      on trips.id = trip_members.trip_id
    where trip_members.trip_id = p_trip_id
      and trip_members.user_id = auth.uid()
      and trip_members.role in ('owner','editor')
      and trips.deleted_at is null
      and trips.trip_status in ('planning', 'active')
  );
$$;

create or replace function public.create_trip_with_travelers(
  p_name text,
  p_start_date date default null,
  p_end_date date default null,
  p_default_currency text default 'MYR',
  p_traveler_names text[] default array[]::text[]
)
returns uuid
language plpgsql
security definer
set search_path = public, private
as $$
declare
  new_trip_id uuid;
  cleaned_names text[];
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if nullif(trim(p_name), '') is null then
    raise exception 'Trip name is required';
  end if;

  if p_start_date is not null and p_end_date is not null and p_end_date < p_start_date then
    raise exception 'Trip end date must be on or after start date';
  end if;

  select coalesce(array_agg(cleaned_name order by ordinal), array[]::text[])
  into cleaned_names
  from (
    select trim(raw_name) as cleaned_name, ordinal
    from unnest(coalesce(p_traveler_names, array[]::text[])) with ordinality as names(raw_name, ordinal)
  ) normalized
  where cleaned_name <> '';

  if exists (
    select 1
    from unnest(cleaned_names) as names(cleaned_name)
    where length(cleaned_name) > 80
  ) then
    raise exception 'Traveler names must be 80 characters or fewer';
  end if;

  if (
    select count(*)
    from unnest(cleaned_names) as names(cleaned_name)
  ) <> (
    select count(distinct lower(cleaned_name))
    from unnest(cleaned_names) as names(cleaned_name)
  ) then
    raise exception 'Traveler names must be unique';
  end if;

  insert into public.trips (owner_id, name, start_date, end_date, default_currency)
  values (auth.uid(), trim(p_name), p_start_date, p_end_date, p_default_currency)
  returning id into new_trip_id;

  insert into public.trip_members (trip_id, user_id, role)
  values (new_trip_id, auth.uid(), 'owner');

  perform private.sync_trip_days(new_trip_id, p_start_date, p_end_date);

  insert into public.travelers (trip_id, name)
  select new_trip_id, cleaned_name
  from unnest(cleaned_names) as names(cleaned_name);

  return new_trip_id;
end;
$$;

create or replace function public.add_traveler(
  p_trip_id uuid,
  p_name text
)
returns uuid
language plpgsql
security definer
set search_path = public, private
as $$
declare
  new_traveler_id uuid;
  cleaned_name text := trim(coalesce(p_name, ''));
begin
  if not private.can_edit_trip(p_trip_id) then
    raise exception 'You do not have permission to add travelers';
  end if;

  if cleaned_name = '' then
    raise exception 'Traveler name is required';
  end if;

  if length(cleaned_name) > 80 then
    raise exception 'Traveler names must be 80 characters or fewer';
  end if;

  insert into public.travelers (trip_id, name)
  values (p_trip_id, cleaned_name)
  returning id into new_traveler_id;

  return new_traveler_id;
end;
$$;

create or replace function public.ensure_trip_day(
  p_trip_id uuid,
  p_date date,
  p_day_number integer default null
)
returns uuid
language plpgsql
security definer
set search_path = public, private
as $$
declare
  selected_trip public.trips%rowtype;
  selected_trip_day_id uuid;
begin
  if not private.can_edit_trip(p_trip_id) then
    raise exception 'You do not have permission to edit itinerary days';
  end if;

  if p_date is null then
    raise exception 'Trip day date is required';
  end if;

  select *
  into selected_trip
  from public.trips
  where id = p_trip_id;

  if selected_trip.id is null then
    raise exception 'Trip not found';
  end if;

  if selected_trip.start_date is not null and p_date < selected_trip.start_date then
    raise exception 'This itinerary date is outside the trip date range';
  end if;

  if selected_trip.end_date is not null and p_date > selected_trip.end_date then
    raise exception 'This itinerary date is outside the trip date range';
  end if;

  insert into public.trip_days (trip_id, date, day_number)
  values (p_trip_id, p_date, p_day_number)
  on conflict (trip_id, date) do update
  set
    day_number = coalesce(excluded.day_number, public.trip_days.day_number),
    updated_at = now()
  returning id into selected_trip_day_id;

  return selected_trip_day_id;
end;
$$;

create or replace function public.create_schedule_item(
  p_trip_id uuid,
  p_trip_day_id uuid default null,
  p_trip_day_date date default null,
  p_trip_day_number integer default null,
  p_time_block text default null,
  p_title text default null,
  p_description text default null,
  p_transport text default null,
  p_food text default null,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, private
as $$
declare
  selected_trip_day_id uuid := p_trip_day_id;
  new_schedule_item_id uuid;
  next_sort_order integer;
begin
  if not private.can_edit_trip(p_trip_id) then
    raise exception 'You do not have permission to create itinerary items';
  end if;

  if nullif(trim(coalesce(p_title, '')), '') is null then
    raise exception 'Itinerary title is required';
  end if;

  if selected_trip_day_id is null then
    selected_trip_day_id := public.ensure_trip_day(p_trip_id, p_trip_day_date, p_trip_day_number);
  elsif not exists (
    select 1
    from public.trip_days
    where id = selected_trip_day_id
      and trip_id = p_trip_id
  ) then
    raise exception 'The itinerary day does not belong to this trip';
  end if;

  select coalesce(max(sort_order), 0) + 1
  into next_sort_order
  from public.schedule_items
  where trip_id = p_trip_id
    and trip_day_id = selected_trip_day_id;

  insert into public.schedule_items (
    trip_id,
    trip_day_id,
    time_block,
    title,
    description,
    transport,
    food,
    notes,
    sort_order
  )
  values (
    p_trip_id,
    selected_trip_day_id,
    nullif(trim(coalesce(p_time_block, '')), ''),
    trim(p_title),
    nullif(trim(coalesce(p_description, '')), ''),
    nullif(trim(coalesce(p_transport, '')), ''),
    nullif(trim(coalesce(p_food, '')), ''),
    nullif(trim(coalesce(p_notes, '')), ''),
    next_sort_order
  )
  returning id into new_schedule_item_id;

  return new_schedule_item_id;
end;
$$;

create or replace function public.complete_trip(p_trip_id uuid)
returns void
language plpgsql
security definer
set search_path = public, private
as $$
begin
  if not private.is_trip_owner(p_trip_id) then
    raise exception 'Only the trip owner can complete this trip';
  end if;

  update public.trips
  set trip_status = 'completed',
      updated_at = now()
  where id = p_trip_id
    and deleted_at is null
    and trip_status in ('planning', 'active');

  if not found then
    raise exception 'Trip cannot be completed from its current state';
  end if;
end;
$$;

create or replace function private.write_expense_splits(
  p_trip_id uuid,
  p_expense_id uuid,
  p_splits jsonb
)
returns void
language plpgsql
security definer
set search_path = public, private
as $$
begin
  if not private.can_edit_trip(p_trip_id) then
    raise exception 'You do not have permission to write expense splits';
  end if;

  if not exists (
    select 1
    from public.trip_expenses
    where id = p_expense_id
      and trip_id = p_trip_id
  ) then
    raise exception 'Expense does not belong to this trip';
  end if;

  delete from public.expense_splits
  where trip_expense_id = p_expense_id;

  insert into public.expense_splits (trip_id, trip_expense_id, traveler_id, amount)
  select p_trip_id, p_expense_id, (item->>'traveler_id')::uuid, (item->>'amount')::numeric
  from jsonb_array_elements(coalesce(p_splits, '[]'::jsonb)) as item;
end;
$$;

create or replace function public.create_expense(
  p_trip_id uuid,
  p_category text,
  p_expense_name text,
  p_currency text,
  p_total_amount numeric,
  p_paid_by_traveler_id uuid,
  p_splits jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public, private
as $$
declare new_expense_id uuid;
begin
  if not private.can_edit_trip(p_trip_id) then
    raise exception 'You do not have permission to create expenses';
  end if;

  insert into public.trip_expenses (trip_id, category, expense_name, currency, total_amount, paid_by_traveler_id)
  values (p_trip_id, lower(trim(p_category)), trim(p_expense_name), p_currency, p_total_amount, p_paid_by_traveler_id)
  returning id into new_expense_id;

  perform private.write_expense_splits(p_trip_id, new_expense_id, p_splits);
  return new_expense_id;
end;
$$;

create or replace function public.create_expense(
  p_trip_id uuid,
  p_category text,
  p_expense_name text,
  p_currency text,
  p_total_amount numeric,
  p_paid_by_traveler_id uuid,
  p_splits jsonb,
  p_expense_date date,
  p_expense_time time,
  p_notes text
)
returns uuid
language plpgsql
security definer
set search_path = public, private
as $$
declare new_expense_id uuid;
begin
  if not private.can_edit_trip(p_trip_id) then
    raise exception 'You do not have permission to create expenses';
  end if;

  insert into public.trip_expenses (
    trip_id,
    category,
    expense_name,
    currency,
    total_amount,
    paid_by_traveler_id,
    expense_date,
    expense_time,
    notes
  )
  values (
    p_trip_id,
    lower(trim(p_category)),
    trim(p_expense_name),
    p_currency,
    p_total_amount,
    p_paid_by_traveler_id,
    p_expense_date,
    p_expense_time,
    nullif(trim(p_notes), '')
  )
  returning id into new_expense_id;

  perform private.write_expense_splits(p_trip_id, new_expense_id, p_splits);
  return new_expense_id;
end;
$$;

create or replace function public.update_expense(
  p_expense_id uuid,
  p_category text,
  p_expense_name text,
  p_currency text,
  p_total_amount numeric,
  p_paid_by_traveler_id uuid,
  p_splits jsonb
)
returns void
language plpgsql
security definer
set search_path = public, private
as $$
declare parent_trip_id uuid;
begin
  select trip_id into parent_trip_id
  from public.trip_expenses
  where id = p_expense_id;

  if parent_trip_id is null or not private.can_edit_trip(parent_trip_id) then
    raise exception 'You do not have permission to update expenses';
  end if;

  update public.trip_expenses
  set category = lower(trim(p_category)),
      expense_name = trim(p_expense_name),
      currency = p_currency,
      total_amount = p_total_amount,
      paid_by_traveler_id = p_paid_by_traveler_id,
      updated_at = now()
  where id = p_expense_id;

  perform private.write_expense_splits(parent_trip_id, p_expense_id, p_splits);
end;
$$;

create or replace function public.update_expense(
  p_expense_id uuid,
  p_category text,
  p_expense_name text,
  p_currency text,
  p_total_amount numeric,
  p_paid_by_traveler_id uuid,
  p_splits jsonb,
  p_expense_date date,
  p_expense_time time,
  p_notes text
)
returns void
language plpgsql
security definer
set search_path = public, private
as $$
declare parent_trip_id uuid;
begin
  select trip_id into parent_trip_id
  from public.trip_expenses
  where id = p_expense_id;

  if parent_trip_id is null or not private.can_edit_trip(parent_trip_id) then
    raise exception 'You do not have permission to update expenses';
  end if;

  update public.trip_expenses
  set category = lower(trim(p_category)),
      expense_name = trim(p_expense_name),
      currency = p_currency,
      total_amount = p_total_amount,
      paid_by_traveler_id = p_paid_by_traveler_id,
      expense_date = p_expense_date,
      expense_time = p_expense_time,
      notes = nullif(trim(p_notes), ''),
      updated_at = now()
  where id = p_expense_id;

  perform private.write_expense_splits(parent_trip_id, p_expense_id, p_splits);
end;
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
    coalesce(my_membership.role, case when trips.owner_id = auth.uid() then 'owner' end) as role,
    owners.email as owner_email,
    coalesce(traveler_counts.traveler_count, 0) as traveler_count,
    coalesce(member_counts.member_count, 0) as member_count
  from public.trips
  join public.trip_members my_membership
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
  where auth.uid() is not null
  order by trips.created_at desc;
$$;

alter table public.trip_expenses
  drop constraint if exists trip_expenses_total_amount_check;

alter table public.trip_expenses
  add constraint trip_expenses_total_amount_check check (total_amount > 0) not valid;

revoke all on function public.create_trip(text, date, date, text) from public;
revoke all on function public.create_trip(text, date, date, text) from authenticated;
revoke all on function public.create_seed_trip() from public;
revoke all on function public.create_seed_trip() from authenticated;
revoke all on function public.write_expense_splits(uuid, uuid, jsonb) from public;
revoke all on function public.write_expense_splits(uuid, uuid, jsonb) from authenticated;
drop function if exists public.write_expense_splits(uuid, uuid, jsonb);

revoke all on function private.write_expense_splits(uuid, uuid, jsonb) from public;
revoke all on function public.create_trip_with_travelers(text, date, date, text, text[]) from public;
revoke all on function public.add_traveler(uuid, text) from public;
revoke all on function public.ensure_trip_day(uuid, date, integer) from public;
revoke all on function public.create_schedule_item(uuid, uuid, date, integer, text, text, text, text, text, text) from public;
revoke all on function public.get_trip_cards() from public;
revoke all on function public.complete_trip(uuid) from public;
revoke all on function public.create_expense(uuid, text, text, text, numeric, uuid, jsonb) from public;
revoke all on function public.create_expense(uuid, text, text, text, numeric, uuid, jsonb, date, time, text) from public;
revoke all on function public.update_expense(uuid, text, text, text, numeric, uuid, jsonb) from public;
revoke all on function public.update_expense(uuid, text, text, text, numeric, uuid, jsonb, date, time, text) from public;

grant execute on function public.create_trip_with_travelers(text, date, date, text, text[]) to authenticated;
grant execute on function public.add_traveler(uuid, text) to authenticated;
grant execute on function public.ensure_trip_day(uuid, date, integer) to authenticated;
grant execute on function public.create_schedule_item(uuid, uuid, date, integer, text, text, text, text, text, text) to authenticated;
grant execute on function public.get_trip_cards() to authenticated;
grant execute on function public.complete_trip(uuid) to authenticated;
grant execute on function public.create_expense(uuid, text, text, text, numeric, uuid, jsonb) to authenticated;
grant execute on function public.create_expense(uuid, text, text, text, numeric, uuid, jsonb, date, time, text) to authenticated;
grant execute on function public.update_expense(uuid, text, text, text, numeric, uuid, jsonb) to authenticated;
grant execute on function public.update_expense(uuid, text, text, text, numeric, uuid, jsonb, date, time, text) to authenticated;
