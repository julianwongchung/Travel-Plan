create or replace function public.reorder_schedule_items(
  p_trip_id uuid,
  p_trip_day_id uuid,
  p_schedule_item_ids uuid[]
)
returns void
language plpgsql
security definer
set search_path = public, private
as $$
declare
  existing_item_count integer;
  distinct_item_count integer;
begin
  if not private.can_edit_trip(p_trip_id) then
    raise exception 'You do not have permission to reorder itinerary items';
  end if;

  if p_schedule_item_ids is null then
    raise exception 'The itinerary order is required';
  end if;

  select count(*) into existing_item_count
  from public.schedule_items
  where trip_id = p_trip_id
    and trip_day_id = p_trip_day_id;

  select count(distinct item_id) into distinct_item_count
  from unnest(coalesce(p_schedule_item_ids, array[]::uuid[])) as submitted_items(item_id);

  if cardinality(p_schedule_item_ids) <> existing_item_count
    or distinct_item_count <> existing_item_count
    or exists (
      select 1
      from unnest(coalesce(p_schedule_item_ids, array[]::uuid[])) as submitted_items(item_id)
      where not exists (
        select 1
        from public.schedule_items
        where id = submitted_items.item_id
          and trip_id = p_trip_id
          and trip_day_id = p_trip_day_id
      )
    )
  then
    raise exception 'The itinerary order does not match the selected trip day';
  end if;

  update public.schedule_items as schedule_item
  set
    sort_order = ordered_items.position::integer,
    updated_at = now()
  from unnest(p_schedule_item_ids) with ordinality as ordered_items(item_id, position)
  where schedule_item.id = ordered_items.item_id
    and schedule_item.trip_id = p_trip_id
    and schedule_item.trip_day_id = p_trip_day_id;
end;
$$;

revoke all on function public.reorder_schedule_items(uuid, uuid, uuid[]) from public;
grant execute on function public.reorder_schedule_items(uuid, uuid, uuid[]) to authenticated;
