create or replace function public.update_schedule_item(
  p_schedule_item_id uuid,
  p_time_block text,
  p_title text,
  p_description text,
  p_transport text,
  p_food text,
  p_notes text
)
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
    raise exception 'You do not have permission to update itinerary items';
  end if;

  if nullif(trim(p_title), '') is null then
    raise exception 'Itinerary title is required';
  end if;

  update public.schedule_items
  set
    time_block = nullif(trim(p_time_block), ''),
    title = trim(p_title),
    description = nullif(trim(p_description), ''),
    transport = nullif(trim(p_transport), ''),
    food = nullif(trim(p_food), ''),
    notes = nullif(trim(p_notes), ''),
    updated_at = now()
  where id = p_schedule_item_id;
end;
$$;

revoke all on function public.update_schedule_item(uuid, text, text, text, text, text, text) from public;
grant execute on function public.update_schedule_item(uuid, text, text, text, text, text, text) to authenticated;
