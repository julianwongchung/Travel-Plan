update public.profiles
set app_role = 'viewer',
    updated_at = now()
where coalesce(app_role, '') not in ('admin', 'viewer');

alter table public.profiles
  alter column app_role set default 'viewer';

alter table public.profiles
  drop constraint if exists profiles_app_role_check;

alter table public.profiles
  add constraint profiles_app_role_check check (app_role in ('admin', 'viewer'));

update public.trip_members
set role = 'viewer'
where role is distinct from 'viewer';

alter table public.trip_members
  alter column role set default 'viewer';

alter table public.trip_members
  drop constraint if exists trip_members_role_check;

alter table public.trip_members
  add constraint trip_members_role_check check (role = 'viewer');

update public.trip_invitations
set role = 'viewer'
where role is distinct from 'viewer';

alter table public.trip_invitations
  alter column role set default 'viewer';

alter table public.trip_invitations
  drop constraint if exists trip_invitations_role_check;

alter table public.trip_invitations
  add constraint trip_invitations_role_check check (role = 'viewer');

drop function if exists private.is_app_guest();

create or replace function private.is_active_app_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and is_active = true
  );
$$;

create or replace function private.is_app_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and app_role = 'admin'
      and is_active = true
  );
$$;

create or replace function private.can_view_trip(p_trip_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select private.is_active_app_user()
    and exists (
      select 1
      from public.trips
      where trips.id = p_trip_id
        and (
          private.is_app_admin()
          or (
            trips.deleted_at is null
            and exists (
              select 1
              from public.trip_members
              where trip_id = p_trip_id
                and user_id = auth.uid()
            )
          )
        )
    );
$$;

create or replace function private.can_manage_trip(p_trip_id uuid)
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
    );
$$;

create or replace function private.is_trip_member(p_trip_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select private.can_view_trip(p_trip_id);
$$;

create or replace function private.is_trip_owner(p_trip_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select private.can_manage_trip(p_trip_id);
$$;

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
    );
$$;

create or replace function private.can_add_expense(p_trip_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select private.can_view_trip(p_trip_id)
    and exists (
      select 1
      from public.trips
      where id = p_trip_id
        and deleted_at is null
    );
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
declare
  normalized_email text := private.normalize_email(new.email);
begin
  insert into public.profiles (id, email, full_name, avatar_url, app_role, is_active)
  values (
    new.id,
    normalized_email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url',
    case
      when normalized_email = 'test@gmail.com' then 'admin'
      else 'viewer'
    end,
    true
  )
  on conflict (id) do update
  set email = excluded.email,
      full_name = coalesce(excluded.full_name, public.profiles.full_name),
      avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url),
      app_role = case
        when normalized_email = 'test@gmail.com' then 'admin'
        when public.profiles.app_role not in ('admin', 'viewer') then 'viewer'
        else public.profiles.app_role
      end,
      is_active = case
        when normalized_email = 'test@gmail.com' then true
        else public.profiles.is_active
      end,
      updated_at = now();
  return new;
end;
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

  if not private.is_app_admin() then
    raise exception 'Only admins can create trips';
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
  values (new_trip_id, auth.uid(), 'viewer');

  perform private.sync_trip_days(new_trip_id, p_start_date, p_end_date);

  insert into public.travelers (trip_id, name)
  select new_trip_id, cleaned_name
  from unnest(cleaned_names) as names(cleaned_name);

  return new_trip_id;
end;
$$;

create or replace function public.create_trip(
  p_name text,
  p_start_date date default null,
  p_end_date date default null,
  p_default_currency text default 'MYR'
)
returns uuid
language sql
security definer
set search_path = public, private
as $$
  select public.create_trip_with_travelers(
    p_name,
    p_start_date,
    p_end_date,
    p_default_currency,
    array[]::text[]
  );
$$;

create or replace function public.update_trip(
  p_trip_id uuid,
  p_name text,
  p_start_date date,
  p_end_date date,
  p_default_currency text
)
returns void
language plpgsql
security definer
set search_path = public, private
as $$
begin
  if not private.can_edit_trip(p_trip_id) then
    raise exception 'Only admins can update trips';
  end if;

  if nullif(trim(p_name), '') is null then
    raise exception 'Trip name is required';
  end if;

  if p_start_date is not null and p_end_date is not null and p_end_date < p_start_date then
    raise exception 'Trip end date must be on or after start date';
  end if;

  update public.trips
  set name = trim(p_name),
      start_date = p_start_date,
      end_date = p_end_date,
      default_currency = p_default_currency,
      updated_at = now()
  where id = p_trip_id
    and deleted_at is null;

  perform private.sync_trip_days(p_trip_id, p_start_date, p_end_date);
end;
$$;

create or replace function public.complete_trip(p_trip_id uuid)
returns void
language plpgsql
security definer
set search_path = public, private
as $$
begin
  if not private.can_edit_trip(p_trip_id) then
    raise exception 'Only admins can complete trips';
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

create or replace function public.archive_trip(p_trip_id uuid)
returns void
language plpgsql
security definer
set search_path = public, private
as $$
begin
  if not private.can_edit_trip(p_trip_id) then
    raise exception 'Only admins can archive trips';
  end if;

  update public.trips
  set trip_status = 'archived',
      updated_at = now()
  where id = p_trip_id
    and deleted_at is null;
end;
$$;

create or replace function public.restore_archived_trip(p_trip_id uuid)
returns void
language plpgsql
security definer
set search_path = public, private
as $$
begin
  if not private.can_manage_trip(p_trip_id) then
    raise exception 'Only admins can restore archived trips';
  end if;

  update public.trips
  set trip_status = 'completed',
      updated_at = now()
  where id = p_trip_id
    and deleted_at is null
    and trip_status = 'archived';
end;
$$;

create or replace function public.soft_delete_trip(p_trip_id uuid)
returns void
language plpgsql
security definer
set search_path = public, private
as $$
begin
  if not private.can_manage_trip(p_trip_id) then
    raise exception 'Only admins can delete trips';
  end if;

  update public.trips
  set deleted_at = now(),
      deleted_by = auth.uid(),
      updated_at = now()
  where id = p_trip_id
    and deleted_at is null;
end;
$$;

create or replace function public.restore_deleted_trip(p_trip_id uuid)
returns void
language plpgsql
security definer
set search_path = public, private
as $$
begin
  if not private.can_manage_trip(p_trip_id) then
    raise exception 'Only admins can restore deleted trips';
  end if;

  update public.trips
  set deleted_at = null,
      deleted_by = null,
      updated_at = now()
  where id = p_trip_id
    and deleted_at is not null;
end;
$$;

create or replace function public.leave_trip(p_trip_id uuid)
returns void
language plpgsql
security definer
set search_path = public, private
as $$
begin
  if not private.can_manage_trip(p_trip_id) then
    raise exception 'Only admins can manage trip access';
  end if;

  delete from public.trip_members
  where trip_id = p_trip_id
    and user_id = auth.uid();
end;
$$;

create or replace function public.invite_trip_member(
  p_trip_id uuid,
  p_email text,
  p_role text
)
returns uuid
language plpgsql
security definer
set search_path = public, private
as $$
declare
  normalized_email text := private.normalize_email(p_email);
  invited_profile_id uuid;
  invitation_id uuid;
begin
  if not private.can_manage_trip(p_trip_id) then
    raise exception 'Only admins can invite members';
  end if;

  if p_role is not null and p_role <> 'viewer' then
    raise exception 'Trip invitations only support Viewer access';
  end if;

  if normalized_email = '' then
    raise exception 'Email is required';
  end if;

  select id into invited_profile_id
  from public.profiles
  where private.normalize_email(email) = normalized_email;

  insert into public.trip_invitations (trip_id, invited_email, role, invited_by, status)
  values (p_trip_id, normalized_email, 'viewer', auth.uid(), 'pending')
  on conflict (trip_id, invited_email) do update
  set role = 'viewer',
      invited_by = excluded.invited_by,
      status = 'pending',
      accepted_at = null
  returning id into invitation_id;

  if invited_profile_id is not null then
    insert into public.trip_members (trip_id, user_id, role)
    values (p_trip_id, invited_profile_id, 'viewer')
    on conflict (trip_id, user_id) do update
    set role = 'viewer';
  end if;

  return invitation_id;
end;
$$;

create or replace function public.accept_pending_invitations()
returns void
language plpgsql
security definer
set search_path = public, private
as $$
declare
  normalized_email text;
begin
  if auth.uid() is null then
    return;
  end if;

  select private.normalize_email(email)
  into normalized_email
  from public.profiles
  where id = auth.uid();

  insert into public.trip_members (trip_id, user_id, role)
  select trip_id, auth.uid(), 'viewer'
  from public.trip_invitations
  where invited_email = normalized_email
    and status = 'pending'
  on conflict (trip_id, user_id) do update
  set role = 'viewer';

  update public.trip_invitations
  set status = 'accepted',
      accepted_at = now()
  where invited_email = normalized_email
    and status = 'pending';
end;
$$;

create or replace function public.update_trip_member_role(
  p_member_id uuid,
  p_role text
)
returns void
language plpgsql
security definer
set search_path = public, private
as $$
declare
  member_trip_id uuid;
begin
  if p_role <> 'viewer' then
    raise exception 'Trip membership only supports Viewer access';
  end if;

  select trip_id into member_trip_id
  from public.trip_members
  where id = p_member_id;

  if member_trip_id is null or not private.can_manage_trip(member_trip_id) then
    raise exception 'Only admins can change member access';
  end if;

  update public.trip_members
  set role = 'viewer'
  where id = p_member_id;
end;
$$;

create or replace function public.remove_trip_member(p_member_id uuid)
returns void
language plpgsql
security definer
set search_path = public, private
as $$
declare
  member_trip_id uuid;
begin
  select trip_id into member_trip_id
  from public.trip_members
  where id = p_member_id;

  if member_trip_id is null or not private.can_manage_trip(member_trip_id) then
    raise exception 'Only admins can remove members';
  end if;

  delete from public.trip_members
  where id = p_member_id;
end;
$$;

create or replace function public.cancel_trip_invitation(p_invitation_id uuid)
returns void
language plpgsql
security definer
set search_path = public, private
as $$
declare
  invitation_trip_id uuid;
begin
  select trip_id into invitation_trip_id
  from public.trip_invitations
  where id = p_invitation_id;

  if invitation_trip_id is null or not private.can_manage_trip(invitation_trip_id) then
    raise exception 'Only admins can cancel invitations';
  end if;

  update public.trip_invitations
  set status = 'cancelled'
  where id = p_invitation_id;
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
  if not private.can_add_expense(p_trip_id) then
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
  if not private.can_add_expense(p_trip_id) then
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
  if not private.can_add_expense(p_trip_id) then
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

create or replace function public.soft_delete_expense(p_expense_id uuid)
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
    raise exception 'You do not have permission to delete expenses';
  end if;

  update public.trip_expenses
  set deleted_at = now(),
      deleted_by = auth.uid(),
      updated_at = now()
  where id = p_expense_id;
end;
$$;

create or replace function public.restore_expense(p_expense_id uuid)
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
    raise exception 'You do not have permission to restore expenses';
  end if;

  update public.trip_expenses
  set deleted_at = null,
      deleted_by = null,
      updated_at = now()
  where id = p_expense_id;
end;
$$;

drop function if exists public.get_trip_cards();

create function public.get_trip_cards()
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
    owners.email as owner_email,
    coalesce(traveler_counts.traveler_count, 0) as traveler_count,
    coalesce(member_counts.member_count, 0) as member_count
  from public.trips
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
  where private.can_view_trip(trips.id)
  order by trips.created_at desc;
$$;

revoke select on table
  public.trips,
  public.trip_days,
  public.schedule_items,
  public.places,
  public.trip_expenses,
  public.expense_splits,
  public.travelers,
  public.trip_hotels,
  public.trip_flights
from anon;

grant select on table
  public.trips,
  public.trip_members,
  public.trip_invitations,
  public.trip_days,
  public.schedule_items,
  public.places,
  public.trip_expenses,
  public.expense_splits,
  public.travelers,
  public.trip_hotels,
  public.trip_flights
to authenticated;

revoke insert, update, delete on table
  public.trips,
  public.trip_members,
  public.trip_invitations,
  public.trip_days,
  public.schedule_items,
  public.places,
  public.trip_expenses,
  public.expense_splits,
  public.travelers,
  public.trip_hotels,
  public.trip_flights
from authenticated;

drop policy if exists profiles_select_related on public.profiles;
drop policy if exists profiles_select_admin on public.profiles;
drop policy if exists profiles_select_account on public.profiles;
create policy profiles_select_account on public.profiles
  for select to authenticated
  using (id = auth.uid() or private.is_app_admin());

drop policy if exists profiles_insert_self on public.profiles;
create policy profiles_insert_self on public.profiles
  for insert to authenticated
  with check (id = auth.uid() and app_role = 'viewer' and is_active = true);

drop policy if exists profiles_update_self on public.profiles;
drop policy if exists profiles_update_admin on public.profiles;
drop policy if exists profiles_update_account_admin on public.profiles;
create policy profiles_update_account_admin on public.profiles
  for update to authenticated
  using (private.is_app_admin())
  with check (private.is_app_admin());

drop policy if exists trips_select_guest_read on public.trips;
drop policy if exists trips_select_account_read on public.trips;
create policy trips_select_account_read
  on public.trips for select
  to authenticated
  using (private.can_view_trip(id));

drop policy if exists trips_insert_owner on public.trips;
drop policy if exists trips_insert_admin on public.trips;
create policy trips_insert_admin
  on public.trips for insert
  to authenticated
  with check (private.is_app_admin() and owner_id = auth.uid());

drop policy if exists trips_update_owner on public.trips;
drop policy if exists trips_update_admin on public.trips;
create policy trips_update_admin
  on public.trips for update
  to authenticated
  using (private.can_edit_trip(id))
  with check (private.can_edit_trip(id));

drop policy if exists trip_members_insert_owner on public.trip_members;
drop policy if exists trip_members_update_owner on public.trip_members;
drop policy if exists trip_members_delete_owner_or_self on public.trip_members;
drop policy if exists trip_members_write_admin on public.trip_members;
create policy trip_members_write_admin
  on public.trip_members for all
  to authenticated
  using (private.can_manage_trip(trip_id))
  with check (private.can_manage_trip(trip_id) and role = 'viewer');

drop policy if exists trip_invitations_select_owner on public.trip_invitations;
drop policy if exists trip_invitations_write_owner on public.trip_invitations;
drop policy if exists trip_invitations_admin on public.trip_invitations;
create policy trip_invitations_admin
  on public.trip_invitations for all
  to authenticated
  using (private.can_manage_trip(trip_id))
  with check (private.can_manage_trip(trip_id) and role = 'viewer');

drop policy if exists trip_days_select_guest_read on public.trip_days;
drop policy if exists trip_days_select_account_read on public.trip_days;
create policy trip_days_select_account_read
  on public.trip_days for select
  to authenticated
  using (private.can_view_trip(trip_id));

drop policy if exists schedule_items_select_guest_read on public.schedule_items;
drop policy if exists schedule_items_select_account_read on public.schedule_items;
create policy schedule_items_select_account_read
  on public.schedule_items for select
  to authenticated
  using (private.can_view_trip(trip_id));

drop policy if exists places_select_guest_read on public.places;
drop policy if exists places_select_account_read on public.places;
create policy places_select_account_read
  on public.places for select
  to authenticated
  using (deleted_at is null and private.can_view_trip(trip_id));

drop policy if exists travelers_select_guest_read on public.travelers;
drop policy if exists travelers_select_account_read on public.travelers;
create policy travelers_select_account_read
  on public.travelers for select
  to authenticated
  using (deleted_at is null and private.can_view_trip(trip_id));

drop policy if exists trip_expenses_select_guest_read on public.trip_expenses;
drop policy if exists trip_expenses_select_account_read on public.trip_expenses;
create policy trip_expenses_select_account_read
  on public.trip_expenses for select
  to authenticated
  using (deleted_at is null and private.can_view_trip(trip_id));

drop policy if exists expense_splits_select_guest_read on public.expense_splits;
drop policy if exists expense_splits_select_account_read on public.expense_splits;
create policy expense_splits_select_account_read
  on public.expense_splits for select
  to authenticated
  using (private.can_view_trip(trip_id));

drop policy if exists travelers_insert_editors on public.travelers;
drop policy if exists travelers_update_editors on public.travelers;
drop policy if exists trip_days_insert_editors on public.trip_days;
drop policy if exists trip_days_update_editors on public.trip_days;
drop policy if exists schedule_items_insert_editors on public.schedule_items;
drop policy if exists schedule_items_update_editors on public.schedule_items;
drop policy if exists schedule_items_delete_editors on public.schedule_items;
drop policy if exists places_insert_editors on public.places;
drop policy if exists places_update_editors on public.places;
drop policy if exists trip_expenses_insert_editors on public.trip_expenses;
drop policy if exists trip_expenses_update_editors on public.trip_expenses;
drop policy if exists expense_splits_insert_editors on public.expense_splits;
drop policy if exists expense_splits_update_editors on public.expense_splits;

drop policy if exists travelers_write_admin on public.travelers;
create policy travelers_write_admin
  on public.travelers for all
  to authenticated
  using (private.can_edit_trip(trip_id))
  with check (private.can_edit_trip(trip_id));

drop policy if exists trip_days_write_admin on public.trip_days;
create policy trip_days_write_admin
  on public.trip_days for all
  to authenticated
  using (private.can_edit_trip(trip_id))
  with check (private.can_edit_trip(trip_id));

drop policy if exists schedule_items_write_admin on public.schedule_items;
create policy schedule_items_write_admin
  on public.schedule_items for all
  to authenticated
  using (private.can_edit_trip(trip_id))
  with check (private.can_edit_trip(trip_id));

drop policy if exists places_write_admin on public.places;
create policy places_write_admin
  on public.places for all
  to authenticated
  using (private.can_edit_trip(trip_id))
  with check (private.can_edit_trip(trip_id));

drop policy if exists trip_expenses_write_admin on public.trip_expenses;
create policy trip_expenses_write_admin
  on public.trip_expenses for all
  to authenticated
  using (private.can_edit_trip(trip_id))
  with check (private.can_edit_trip(trip_id));

drop policy if exists expense_splits_write_admin on public.expense_splits;
create policy expense_splits_write_admin
  on public.expense_splits for all
  to authenticated
  using (private.can_edit_trip(trip_id))
  with check (private.can_edit_trip(trip_id));

drop policy if exists "editors can create trip hotels" on public.trip_hotels;
drop policy if exists "editors can update trip hotels" on public.trip_hotels;
drop policy if exists "members can view trip hotels" on public.trip_hotels;
drop policy if exists trip_hotels_select_guest_read on public.trip_hotels;
drop policy if exists trip_hotels_select_account_read on public.trip_hotels;
create policy trip_hotels_select_account_read
  on public.trip_hotels for select
  to authenticated
  using (deleted_at is null and private.can_view_trip(trip_id));

drop policy if exists trip_hotels_write_admin on public.trip_hotels;
create policy trip_hotels_write_admin
  on public.trip_hotels for all
  to authenticated
  using (private.can_edit_trip(trip_id))
  with check (private.can_edit_trip(trip_id) and created_by = auth.uid());

drop policy if exists "editors can create trip flights" on public.trip_flights;
drop policy if exists "editors can update trip flights" on public.trip_flights;
drop policy if exists "members can view trip flights" on public.trip_flights;
drop policy if exists trip_flights_select_guest_read on public.trip_flights;
drop policy if exists trip_flights_select_account_read on public.trip_flights;
create policy trip_flights_select_account_read
  on public.trip_flights for select
  to authenticated
  using (deleted_at is null and private.can_view_trip(trip_id));

drop policy if exists trip_flights_write_admin on public.trip_flights;
create policy trip_flights_write_admin
  on public.trip_flights for all
  to authenticated
  using (private.can_edit_trip(trip_id))
  with check (private.can_edit_trip(trip_id) and created_by = auth.uid());

revoke all on function private.is_active_app_user() from public;
revoke all on function private.is_app_admin() from public;
revoke all on function private.can_view_trip(uuid) from public;
revoke all on function private.can_manage_trip(uuid) from public;
revoke all on function private.is_trip_member(uuid) from public;
revoke all on function private.is_trip_owner(uuid) from public;
revoke all on function private.can_edit_trip(uuid) from public;
revoke all on function private.can_add_expense(uuid) from public;
revoke all on function private.write_expense_splits(uuid, uuid, jsonb) from public;

grant execute on function private.is_active_app_user() to authenticated;
grant execute on function private.is_app_admin() to authenticated;
grant execute on function private.can_view_trip(uuid) to authenticated;
grant execute on function private.can_manage_trip(uuid) to authenticated;
grant execute on function private.is_trip_member(uuid) to authenticated;
grant execute on function private.is_trip_owner(uuid) to authenticated;
grant execute on function private.can_edit_trip(uuid) to authenticated;
grant execute on function private.can_add_expense(uuid) to authenticated;

grant execute on function public.create_trip(text, date, date, text) to authenticated;
grant execute on function public.create_trip_with_travelers(text, date, date, text, text[]) to authenticated;
grant execute on function public.update_trip(uuid, text, date, date, text) to authenticated;
grant execute on function public.complete_trip(uuid) to authenticated;
grant execute on function public.archive_trip(uuid) to authenticated;
grant execute on function public.restore_archived_trip(uuid) to authenticated;
grant execute on function public.soft_delete_trip(uuid) to authenticated;
grant execute on function public.restore_deleted_trip(uuid) to authenticated;
grant execute on function public.leave_trip(uuid) to authenticated;
grant execute on function public.invite_trip_member(uuid, text, text) to authenticated;
grant execute on function public.accept_pending_invitations() to authenticated;
grant execute on function public.update_trip_member_role(uuid, text) to authenticated;
grant execute on function public.remove_trip_member(uuid) to authenticated;
grant execute on function public.cancel_trip_invitation(uuid) to authenticated;
grant execute on function public.create_expense(uuid, text, text, text, numeric, uuid, jsonb) to authenticated;
grant execute on function public.create_expense(uuid, text, text, text, numeric, uuid, jsonb, date, time, text) to authenticated;
grant execute on function public.update_expense(uuid, text, text, text, numeric, uuid, jsonb) to authenticated;
grant execute on function public.update_expense(uuid, text, text, text, numeric, uuid, jsonb, date, time, text) to authenticated;
grant execute on function public.soft_delete_expense(uuid) to authenticated;
grant execute on function public.restore_expense(uuid) to authenticated;
grant execute on function public.get_trip_cards() to authenticated;
