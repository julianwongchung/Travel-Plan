create or replace function public.delete_schedule_item(p_schedule_item_id uuid)
returns void
language plpgsql
security definer
set search_path = public, private
as $$
declare
  parent_trip_id uuid;
begin
  select trip_id into parent_trip_id
  from public.schedule_items
  where id = p_schedule_item_id;

  if parent_trip_id is null or not private.can_edit_trip(parent_trip_id) then
    raise exception 'You do not have permission to delete itinerary items';
  end if;

  delete from public.schedule_items
  where id = p_schedule_item_id;
end;
$$;

create or replace function public.delete_trip_day(p_trip_day_id uuid)
returns void
language plpgsql
security definer
set search_path = public, private
as $$
declare
  parent_trip_id uuid;
begin
  select trip_id into parent_trip_id
  from public.trip_days
  where id = p_trip_day_id;

  if parent_trip_id is null or not private.can_edit_trip(parent_trip_id) then
    raise exception 'You do not have permission to delete itinerary days';
  end if;

  delete from public.trip_days
  where id = p_trip_day_id;
end;
$$;
