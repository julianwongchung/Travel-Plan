create policy schedule_items_delete_editors on public.schedule_items
  for delete to authenticated using (private.can_edit_trip(trip_id));
