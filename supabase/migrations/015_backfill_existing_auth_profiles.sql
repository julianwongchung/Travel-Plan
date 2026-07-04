insert into public.profiles (
  id,
  email,
  full_name,
  avatar_url,
  app_role,
  is_active
)
select
  users.id,
  private.normalize_email(users.email),
  nullif(users.raw_user_meta_data->>'full_name', ''),
  nullif(users.raw_user_meta_data->>'avatar_url', ''),
  'viewer',
  true
from auth.users
where not exists (
  select 1
  from public.profiles
  where profiles.id = users.id
);

drop policy if exists profiles_select_self on public.profiles;
create policy profiles_select_self on public.profiles
  for select to authenticated
  using (id = auth.uid());

update public.profiles
set app_role = 'admin',
    is_active = true,
    updated_at = now()
where exists (
  select 1
  from public.trips
  where trips.owner_id = profiles.id
);
