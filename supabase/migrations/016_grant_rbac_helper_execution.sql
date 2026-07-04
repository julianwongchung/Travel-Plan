grant usage on schema private to authenticated;

grant execute on function private.is_active_app_user() to authenticated;
grant execute on function private.is_app_admin() to authenticated;
grant execute on function private.is_trip_member(uuid) to authenticated;
grant execute on function private.is_trip_owner(uuid) to authenticated;
grant execute on function private.can_edit_trip(uuid) to authenticated;
