update public.profiles
set app_role = 'admin',
    is_active = true,
    updated_at = now()
where private.normalize_email(email) = 'test@gmail.com';

update public.profiles
set app_role = 'guest',
    is_active = true,
    updated_at = now()
where private.normalize_email(email) = 'test2@gmail.com';

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
      when private.normalize_email(new.email) = 'test@gmail.com' then 'admin'
      when private.normalize_email(new.email) = 'test2@gmail.com' then 'guest'
      else 'viewer'
    end,
    true
  )
  on conflict (id) do update
  set email = excluded.email,
      full_name = coalesce(excluded.full_name, public.profiles.full_name),
      avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url),
      app_role = case
        when private.normalize_email(new.email) = 'test@gmail.com' then 'admin'
        when private.normalize_email(new.email) = 'test2@gmail.com' then 'guest'
        else public.profiles.app_role
      end,
      is_active = case
        when private.normalize_email(new.email) in ('test@gmail.com', 'test2@gmail.com') then true
        else public.profiles.is_active
      end,
      updated_at = now();
  return new;
end;
$$;
