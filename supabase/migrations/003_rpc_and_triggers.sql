create or replace function public.google_maps_link(place_name text, area text default null)
returns text
language sql
immutable
as $$
  select 'https://www.google.com/maps/search/?api=1&query=' ||
    replace(replace(trim(coalesce(place_name, '') || ' ' || coalesce(area, '')), ' ', '%20'), '&', '%26');
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    private.normalize_email(new.email),
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do update
  set email = excluded.email,
      full_name = coalesce(excluded.full_name, public.profiles.full_name),
      avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url),
      updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

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
    values (new_trip_id, p_start_date, 1)
    on conflict do nothing;
  end if;

  return new_trip_id;
end;
$$;

create or replace function public.update_trip(p_trip_id uuid, p_name text, p_start_date date, p_end_date date, p_default_currency text)
returns void language plpgsql security definer set search_path = public, private as $$
begin
  if not private.is_trip_owner(p_trip_id) then raise exception 'Only the trip owner can update trip metadata'; end if;
  update public.trips
  set name = p_name, start_date = p_start_date, end_date = p_end_date, default_currency = p_default_currency, updated_at = now()
  where id = p_trip_id;
end;
$$;

create or replace function public.complete_trip(p_trip_id uuid)
returns void language plpgsql security definer set search_path = public, private as $$
begin
  if not private.is_trip_owner(p_trip_id) then raise exception 'Only the trip owner can complete this trip'; end if;
  update public.trips set trip_status = 'completed', updated_at = now() where id = p_trip_id and deleted_at is null;
end;
$$;

create or replace function public.archive_trip(p_trip_id uuid)
returns void language plpgsql security definer set search_path = public, private as $$
begin
  if not private.is_trip_owner(p_trip_id) then raise exception 'Only the trip owner can archive this trip'; end if;
  update public.trips set trip_status = 'archived', updated_at = now() where id = p_trip_id and deleted_at is null;
end;
$$;

create or replace function public.restore_archived_trip(p_trip_id uuid)
returns void language plpgsql security definer set search_path = public, private as $$
begin
  if not private.is_trip_owner(p_trip_id) then raise exception 'Only the trip owner can restore this trip'; end if;
  update public.trips set trip_status = 'planning', updated_at = now() where id = p_trip_id and trip_status = 'archived' and deleted_at is null;
end;
$$;

create or replace function public.soft_delete_trip(p_trip_id uuid)
returns void language plpgsql security definer set search_path = public, private as $$
begin
  if not private.is_trip_owner(p_trip_id) then raise exception 'Only the trip owner can delete this trip'; end if;
  update public.trips set deleted_at = now(), deleted_by = auth.uid(), updated_at = now() where id = p_trip_id;
end;
$$;

create or replace function public.restore_deleted_trip(p_trip_id uuid)
returns void language plpgsql security definer set search_path = public, private as $$
begin
  if not private.is_trip_owner(p_trip_id) then raise exception 'Only the trip owner can restore this trip'; end if;
  update public.trips set deleted_at = null, deleted_by = null, updated_at = now() where id = p_trip_id;
end;
$$;

create or replace function public.leave_trip(p_trip_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  delete from public.trip_members
  where trip_id = p_trip_id and user_id = auth.uid() and role in ('editor','viewer');
end;
$$;

create or replace function public.invite_trip_member(p_trip_id uuid, p_email text, p_role text)
returns uuid language plpgsql security definer set search_path = public, private as $$
declare
  normalized_email text := private.normalize_email(p_email);
  target_user_id uuid;
  invitation_id uuid;
begin
  if not private.is_trip_owner(p_trip_id) then raise exception 'Only the trip owner can invite members'; end if;
  if p_role not in ('editor','viewer') then raise exception 'Invalid role'; end if;

  select id into target_user_id from public.profiles where email = normalized_email limit 1;

  if target_user_id is not null then
    insert into public.trip_members (trip_id, user_id, role)
    values (p_trip_id, target_user_id, p_role)
    on conflict (trip_id, user_id) do update set role = excluded.role;

    insert into public.trip_invitations (trip_id, invited_email, role, invited_by, status, accepted_at)
    values (p_trip_id, normalized_email, p_role, auth.uid(), 'accepted', now())
    on conflict (trip_id, invited_email) do update set status = 'accepted', role = excluded.role, accepted_at = now()
    returning id into invitation_id;
  else
    insert into public.trip_invitations (trip_id, invited_email, role, invited_by)
    values (p_trip_id, normalized_email, p_role, auth.uid())
    on conflict (trip_id, invited_email) do update set role = excluded.role, status = 'pending', accepted_at = null
    returning id into invitation_id;
  end if;

  return invitation_id;
end;
$$;

create or replace function public.accept_pending_invitations()
returns integer language plpgsql security definer set search_path = public, private as $$
declare
  current_email text;
  invite record;
  accepted_count integer := 0;
begin
  select email into current_email from public.profiles where id = auth.uid();
  if current_email is null then return 0; end if;

  for invite in
    select * from public.trip_invitations where invited_email = private.normalize_email(current_email) and status = 'pending'
  loop
    insert into public.trip_members (trip_id, user_id, role)
    values (invite.trip_id, auth.uid(), invite.role)
    on conflict (trip_id, user_id) do update set role = excluded.role;

    update public.trip_invitations set status = 'accepted', accepted_at = now() where id = invite.id;
    accepted_count := accepted_count + 1;
  end loop;

  return accepted_count;
end;
$$;

create or replace function public.update_trip_member_role(p_member_id uuid, p_role text)
returns void language plpgsql security definer set search_path = public, private as $$
declare
  member_trip_id uuid;
begin
  if p_role not in ('editor','viewer') then raise exception 'Invalid role'; end if;
  select trip_id into member_trip_id from public.trip_members where id = p_member_id and role <> 'owner';
  if member_trip_id is null or not private.is_trip_owner(member_trip_id) then raise exception 'Only the trip owner can change member roles'; end if;
  update public.trip_members set role = p_role where id = p_member_id;
end;
$$;

create or replace function public.remove_trip_member(p_member_id uuid)
returns void language plpgsql security definer set search_path = public, private as $$
declare
  member_trip_id uuid;
begin
  select trip_id into member_trip_id from public.trip_members where id = p_member_id and role <> 'owner';
  if member_trip_id is null or not private.is_trip_owner(member_trip_id) then raise exception 'Only the trip owner can remove members'; end if;
  delete from public.trip_members where id = p_member_id;
end;
$$;

create or replace function public.cancel_trip_invitation(p_invitation_id uuid)
returns void language plpgsql security definer set search_path = public, private as $$
declare
  invitation_trip_id uuid;
begin
  select trip_id into invitation_trip_id from public.trip_invitations where id = p_invitation_id;
  if invitation_trip_id is null or not private.is_trip_owner(invitation_trip_id) then raise exception 'Only the trip owner can cancel invitations'; end if;
  update public.trip_invitations set status = 'cancelled' where id = p_invitation_id and status = 'pending';
end;
$$;

create or replace function public.create_place(p_trip_id uuid, p_name text, p_type text, p_area text, p_google_map_link text, p_notes text, p_priority text, p_rating numeric)
returns uuid language plpgsql security definer set search_path = public, private as $$
declare new_place_id uuid;
begin
  if not private.can_edit_trip(p_trip_id) then raise exception 'You do not have permission to create places'; end if;
  insert into public.places (trip_id, name, type, area, google_map_link, notes, priority, rating)
  values (p_trip_id, p_name, p_type, p_area, coalesce(nullif(p_google_map_link, ''), public.google_maps_link(p_name, p_area)), p_notes, p_priority, p_rating)
  returning id into new_place_id;
  return new_place_id;
end;
$$;

create or replace function public.update_place(p_place_id uuid, p_name text, p_type text, p_area text, p_google_map_link text, p_notes text, p_priority text, p_rating numeric)
returns void language plpgsql security definer set search_path = public, private as $$
declare parent_trip_id uuid;
begin
  select trip_id into parent_trip_id from public.places where id = p_place_id;
  if parent_trip_id is null or not private.can_edit_trip(parent_trip_id) then raise exception 'You do not have permission to update places'; end if;
  update public.places
  set name = p_name, type = p_type, area = p_area, google_map_link = coalesce(nullif(p_google_map_link, ''), public.google_maps_link(p_name, p_area)),
      notes = p_notes, priority = p_priority, rating = p_rating, updated_at = now()
  where id = p_place_id;
end;
$$;

create or replace function public.soft_delete_place(p_place_id uuid)
returns void language plpgsql security definer set search_path = public, private as $$
declare parent_trip_id uuid;
begin
  select trip_id into parent_trip_id from public.places where id = p_place_id;
  if parent_trip_id is null or not private.can_edit_trip(parent_trip_id) then raise exception 'You do not have permission to delete places'; end if;
  update public.places set deleted_at = now(), deleted_by = auth.uid(), updated_at = now() where id = p_place_id;
end;
$$;

create or replace function public.restore_place(p_place_id uuid)
returns void language plpgsql security definer set search_path = public, private as $$
declare parent_trip_id uuid;
begin
  select trip_id into parent_trip_id from public.places where id = p_place_id;
  if parent_trip_id is null or not private.can_edit_trip(parent_trip_id) then raise exception 'You do not have permission to restore places'; end if;
  update public.places set deleted_at = null, deleted_by = null, updated_at = now() where id = p_place_id;
end;
$$;

create or replace function public.write_expense_splits(p_trip_id uuid, p_expense_id uuid, p_splits jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  delete from public.expense_splits where trip_expense_id = p_expense_id;
  insert into public.expense_splits (trip_id, trip_expense_id, traveler_id, amount)
  select p_trip_id, p_expense_id, (item->>'traveler_id')::uuid, (item->>'amount')::numeric
  from jsonb_array_elements(p_splits) as item;
end;
$$;

create or replace function public.create_expense(p_trip_id uuid, p_category text, p_expense_name text, p_currency text, p_total_amount numeric, p_paid_by_traveler_id uuid, p_splits jsonb)
returns uuid language plpgsql security definer set search_path = public, private as $$
declare new_expense_id uuid;
begin
  if not private.can_edit_trip(p_trip_id) then raise exception 'You do not have permission to create expenses'; end if;
  insert into public.trip_expenses (trip_id, category, expense_name, currency, total_amount, paid_by_traveler_id)
  values (p_trip_id, p_category, p_expense_name, p_currency, p_total_amount, p_paid_by_traveler_id)
  returning id into new_expense_id;
  perform public.write_expense_splits(p_trip_id, new_expense_id, p_splits);
  return new_expense_id;
end;
$$;

create or replace function public.update_expense(p_expense_id uuid, p_category text, p_expense_name text, p_currency text, p_total_amount numeric, p_paid_by_traveler_id uuid, p_splits jsonb)
returns void language plpgsql security definer set search_path = public, private as $$
declare parent_trip_id uuid;
begin
  select trip_id into parent_trip_id from public.trip_expenses where id = p_expense_id;
  if parent_trip_id is null or not private.can_edit_trip(parent_trip_id) then raise exception 'You do not have permission to update expenses'; end if;
  update public.trip_expenses
  set category = p_category, expense_name = p_expense_name, currency = p_currency, total_amount = p_total_amount,
      paid_by_traveler_id = p_paid_by_traveler_id, updated_at = now()
  where id = p_expense_id;
  perform public.write_expense_splits(parent_trip_id, p_expense_id, p_splits);
end;
$$;

create or replace function public.soft_delete_expense(p_expense_id uuid)
returns void language plpgsql security definer set search_path = public, private as $$
declare parent_trip_id uuid;
begin
  select trip_id into parent_trip_id from public.trip_expenses where id = p_expense_id;
  if parent_trip_id is null or not private.can_edit_trip(parent_trip_id) then raise exception 'You do not have permission to delete expenses'; end if;
  update public.trip_expenses set deleted_at = now(), deleted_by = auth.uid(), updated_at = now() where id = p_expense_id;
end;
$$;

create or replace function public.restore_expense(p_expense_id uuid)
returns void language plpgsql security definer set search_path = public, private as $$
declare parent_trip_id uuid;
begin
  select trip_id into parent_trip_id from public.trip_expenses where id = p_expense_id;
  if parent_trip_id is null or not private.can_edit_trip(parent_trip_id) then raise exception 'You do not have permission to restore expenses'; end if;
  update public.trip_expenses set deleted_at = null, deleted_by = null, updated_at = now() where id = p_expense_id;
end;
$$;

create or replace function public.validate_expense_split_trip_integrity()
returns trigger language plpgsql as $$
declare
  expense_trip_id uuid;
  traveler_trip_id uuid;
begin
  select trip_id into expense_trip_id from public.trip_expenses where id = new.trip_expense_id;
  select trip_id into traveler_trip_id from public.travelers where id = new.traveler_id;
  if new.trip_id != expense_trip_id then raise exception 'expense_split.trip_id does not match parent expense trip_id'; end if;
  if new.trip_id != traveler_trip_id then raise exception 'expense_split.trip_id does not match traveler trip_id'; end if;
  return new;
end;
$$;

drop trigger if exists check_expense_split_integrity on public.expense_splits;
create trigger check_expense_split_integrity
before insert or update on public.expense_splits
for each row execute function public.validate_expense_split_trip_integrity();

grant execute on all functions in schema public to authenticated;
