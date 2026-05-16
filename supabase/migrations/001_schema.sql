create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create table if not exists public.trips (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  start_date date,
  end_date date,
  default_currency text not null,
  trip_status text not null default 'planning',
  deleted_at timestamptz,
  deleted_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  constraint trips_status_check check (trip_status in ('planning','active','completed','archived')),
  constraint trips_currency_check check (default_currency in ('MYR','SGD','USD','VND','THB','IDR','PHP','JPY','KRW','TWD','HKD'))
);

create table if not exists public.trip_members (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('owner','editor','viewer')),
  created_at timestamptz not null default now(),
  unique (trip_id, user_id)
);

create table if not exists public.trip_invitations (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  invited_email text not null,
  role text not null check (role in ('editor','viewer')),
  invited_by uuid not null references public.profiles(id),
  status text not null default 'pending' check (status in ('pending','accepted','cancelled')),
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  unique (trip_id, invited_email)
);

create table if not exists public.travelers (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  name text not null,
  deleted_at timestamptz,
  deleted_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  unique (id, trip_id)
);

create table if not exists public.trip_days (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  date date not null,
  day_number integer,
  route text,
  hotel_name text,
  hotel_link text,
  remark text,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  unique (trip_id, date),
  unique (id, trip_id)
);

create table if not exists public.schedule_items (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  trip_day_id uuid not null,
  time_block text,
  title text not null,
  description text,
  transport text,
  food text,
  notes text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  constraint schedule_items_day_trip_fk foreign key (trip_day_id, trip_id)
    references public.trip_days(id, trip_id) on delete cascade
);

create table if not exists public.places (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  name text not null,
  type text not null check (type in ('food','hotel','attraction','shopping','transport')),
  area text,
  google_map_link text,
  notes text,
  priority text check (priority in ('must-go','nice-to-have','skip')),
  rating numeric(2,1) check (rating is null or (rating >= 0 and rating <= 5)),
  deleted_at timestamptz,
  deleted_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create table if not exists public.trip_expenses (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  category text,
  expense_name text not null,
  currency text not null check (currency in ('MYR','SGD','USD','VND','THB','IDR','PHP','JPY','KRW','TWD','HKD')),
  total_amount numeric(12,2) not null check (total_amount >= 0),
  paid_by_traveler_id uuid,
  deleted_at timestamptz,
  deleted_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  unique (id, trip_id),
  constraint trip_expenses_paid_by_trip_fk foreign key (paid_by_traveler_id, trip_id)
    references public.travelers(id, trip_id) on delete set null
);

create table if not exists public.expense_splits (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  trip_expense_id uuid not null,
  traveler_id uuid not null,
  amount numeric(12,2) not null check (amount >= 0),
  created_at timestamptz not null default now(),
  unique (trip_expense_id, traveler_id),
  constraint expense_splits_expense_trip_fk foreign key (trip_expense_id, trip_id)
    references public.trip_expenses(id, trip_id) on delete cascade,
  constraint expense_splits_traveler_trip_fk foreign key (traveler_id, trip_id)
    references public.travelers(id, trip_id) on delete cascade
);

create index if not exists trips_owner_id_idx on public.trips (owner_id);
create index if not exists trip_members_trip_id_idx on public.trip_members (trip_id);
create index if not exists trip_members_user_id_idx on public.trip_members (user_id);
create index if not exists trip_invitations_email_idx on public.trip_invitations (invited_email);
create index if not exists travelers_trip_id_idx on public.travelers (trip_id);
create index if not exists trip_days_trip_id_idx on public.trip_days (trip_id);
create index if not exists schedule_items_trip_id_idx on public.schedule_items (trip_id);
create index if not exists places_trip_id_idx on public.places (trip_id);
create index if not exists trip_expenses_trip_id_idx on public.trip_expenses (trip_id);
create index if not exists expense_splits_trip_id_idx on public.expense_splits (trip_id);
