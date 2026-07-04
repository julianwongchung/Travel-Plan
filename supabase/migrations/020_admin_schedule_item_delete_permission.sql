create or replace function private.can_edit_trip(p_trip_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select private.is_app_admin()
    and exists (
      select 1
      from public.trips
      where id = p_trip_id
        and deleted_at is null
        and trip_status in ('planning', 'active')
    );
$$;

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

grant usage on schema private to authenticated;
grant execute on function private.is_app_admin() to authenticated;
grant execute on function private.can_edit_trip(uuid) to authenticated;
grant execute on function public.delete_schedule_item(uuid) to authenticated;
