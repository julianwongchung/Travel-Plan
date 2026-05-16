create or replace function public.create_trip(
  p_name text,
  p_start_date date default null,
  p_end_date date default null,
  p_default_currency text default 'MYR'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_trip_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  insert into public.trips (owner_id, name, start_date, end_date, default_currency)
  values (auth.uid(), p_name, p_start_date, p_end_date, p_default_currency)
  returning id into new_trip_id;

  insert into public.trip_members (trip_id, user_id, role)
  values (new_trip_id, auth.uid(), 'owner');

  if p_start_date is not null then
    insert into public.trip_days (trip_id, date, day_number)
    select
      new_trip_id,
      day_date::date,
      row_number() over (order by day_date)::integer
    from generate_series(
      p_start_date,
      greatest(coalesce(p_end_date, p_start_date), p_start_date),
      interval '1 day'
    ) as generated_days(day_date)
    on conflict do nothing;
  end if;

  return new_trip_id;
end;
$$;
