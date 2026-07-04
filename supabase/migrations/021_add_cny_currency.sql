do $$
declare
  constraint_name text;
begin
  for constraint_name in
    select con.conname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
    where nsp.nspname = 'public'
      and rel.relname = 'trips'
      and con.contype = 'c'
      and pg_get_constraintdef(con.oid) ilike '%default_currency%'
  loop
    execute format('alter table public.trips drop constraint if exists %I', constraint_name);
  end loop;
end $$;

alter table public.trips
  add constraint trips_currency_check
  check (default_currency in ('MYR','SGD','USD','VND','THB','IDR','PHP','JPY','KRW','TWD','HKD','CNY'));

do $$
declare
  constraint_name text;
begin
  for constraint_name in
    select con.conname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
    where nsp.nspname = 'public'
      and rel.relname = 'trip_expenses'
      and con.contype = 'c'
      and pg_get_constraintdef(con.oid) ilike '%currency%'
  loop
    execute format('alter table public.trip_expenses drop constraint if exists %I', constraint_name);
  end loop;
end $$;

alter table public.trip_expenses
  add constraint trip_expenses_currency_check
  check (currency in ('MYR','SGD','USD','VND','THB','IDR','PHP','JPY','KRW','TWD','HKD','CNY'));
