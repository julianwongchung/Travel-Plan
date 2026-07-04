alter table public.profiles
  add column if not exists app_role text not null default 'viewer',
  add column if not exists is_active boolean not null default true;

alter table public.profiles
  drop constraint if exists profiles_app_role_check;

alter table public.profiles
  add constraint profiles_app_role_check check (app_role in ('admin', 'viewer'));

update public.profiles
set app_role = 'admin',
    is_active = true,
    updated_at = now()
where exists (
  select 1
  from public.trips
  where trips.owner_id = profiles.id
);

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

create or replace function private.is_trip_member(p_trip_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select private.is_active_app_user()
    and (
      private.is_app_admin()
      or exists (
        select 1
        from public.trip_members
        where trip_id = p_trip_id
          and user_id = auth.uid()
      )
    );
$$;

create or replace function private.is_trip_owner(p_trip_id uuid)
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

drop policy if exists profiles_insert_self on public.profiles;
create policy profiles_insert_self on public.profiles
  for insert to authenticated
  with check (id = auth.uid() and app_role = 'viewer' and is_active = true);

drop policy if exists profiles_update_self on public.profiles;

drop policy if exists profiles_select_admin on public.profiles;
create policy profiles_select_admin on public.profiles
  for select to authenticated
  using (private.is_app_admin());

drop policy if exists profiles_update_admin on public.profiles;
create policy profiles_update_admin on public.profiles
  for update to authenticated
  using (private.is_app_admin())
  with check (private.is_app_admin());

drop policy if exists trips_insert_owner on public.trips;
create policy trips_insert_owner on public.trips
  for insert to authenticated
  with check (private.is_app_admin() and owner_id = auth.uid());

drop policy if exists trip_members_insert_owner on public.trip_members;
create policy trip_members_insert_owner on public.trip_members
  for insert to authenticated
  with check (private.is_trip_owner(trip_id));

drop policy if exists trip_members_delete_owner_or_self on public.trip_members;
create policy trip_members_delete_owner_or_self on public.trip_members
  for delete to authenticated
  using (private.is_trip_owner(trip_id));

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
  values (new_trip_id, auth.uid(), 'owner');

  perform private.sync_trip_days(new_trip_id, p_start_date, p_end_date);

  insert into public.travelers (trip_id, name)
  select new_trip_id, cleaned_name
  from unnest(cleaned_names) as names(cleaned_name);

  return new_trip_id;
end;
$$;

create or replace function public.get_trip_cards()
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
  role text,
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
    case
      when private.is_app_admin() then 'owner'
      else coalesce(my_membership.role, case when trips.owner_id = auth.uid() then 'owner' end)
    end as role,
    owners.email as owner_email,
    coalesce(traveler_counts.traveler_count, 0) as traveler_count,
    coalesce(member_counts.member_count, 0) as member_count
  from public.trips
  left join public.trip_members my_membership
    on my_membership.trip_id = trips.id
   and my_membership.user_id = auth.uid()
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
  where private.is_active_app_user()
    and (
      private.is_app_admin()
      or my_membership.user_id = auth.uid()
    )
  order by trips.created_at desc;
$$;

create or replace function public.list_app_users()
returns table (
  id uuid,
  email text,
  full_name text,
  app_role text,
  is_active boolean,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public, private
as $$
begin
  if not private.is_app_admin() then
    raise exception 'Only admins can view users';
  end if;

  return query
  select
    profiles.id,
    profiles.email,
    profiles.full_name,
    profiles.app_role,
    profiles.is_active,
    profiles.created_at,
    profiles.updated_at
  from public.profiles
  order by profiles.created_at desc;
end;
$$;

revoke all on function private.is_active_app_user() from public;
revoke all on function private.is_app_admin() from public;
revoke all on function public.list_app_users() from public;

grant execute on function public.list_app_users() to authenticated;
