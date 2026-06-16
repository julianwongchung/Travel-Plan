alter table public.trip_expenses
  add column if not exists expense_date date,
  add column if not exists expense_time time,
  add column if not exists notes text;

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

  perform public.write_expense_splits(p_trip_id, new_expense_id, p_splits);
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

  perform public.write_expense_splits(parent_trip_id, p_expense_id, p_splits);
end;
$$;

revoke all on function public.create_expense(uuid, text, text, text, numeric, uuid, jsonb, date, time, text) from public;
revoke all on function public.update_expense(uuid, text, text, text, numeric, uuid, jsonb, date, time, text) from public;

grant execute on function public.create_expense(uuid, text, text, text, numeric, uuid, jsonb, date, time, text) to authenticated;
grant execute on function public.update_expense(uuid, text, text, text, numeric, uuid, jsonb, date, time, text) to authenticated;
