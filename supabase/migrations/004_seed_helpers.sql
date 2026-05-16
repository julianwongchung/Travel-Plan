create or replace function public.create_seed_trip()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  seed_trip_id uuid;
  julian_id uuid;
  clarrie_id uuid;
  day_id uuid;
  expense_id uuid;
begin
  seed_trip_id := public.create_trip('Da Nang Trip', current_date + 30, current_date + 34, 'MYR');

  insert into public.travelers (trip_id, name) values (seed_trip_id, 'Julian') returning id into julian_id;
  insert into public.travelers (trip_id, name) values (seed_trip_id, 'Clarrie') returning id into clarrie_id;

  insert into public.trip_days (trip_id, date, day_number, route, hotel_name)
  values (seed_trip_id, current_date + 30, 1, 'Airport to My Khe Beach', 'Beachside hotel')
  returning id into day_id;

  insert into public.schedule_items (trip_id, trip_day_id, time_block, title, transport, food, sort_order)
  values (seed_trip_id, day_id, 'Afternoon', 'Arrive and check in', 'Airport transfer', 'Seafood dinner', 1);

  insert into public.places (trip_id, name, type, area, google_map_link, notes, priority, rating)
  values
    (seed_trip_id, 'My Khe Beach', 'attraction', 'Da Nang', public.google_maps_link('My Khe Beach', 'Da Nang'), 'Easy first-day stop.', 'must-go', 4.7),
    (seed_trip_id, 'Han Market', 'shopping', 'Da Nang', public.google_maps_link('Han Market', 'Da Nang'), 'Good for snacks and souvenirs.', 'nice-to-have', 4.2);

  insert into public.trip_expenses (trip_id, category, expense_name, currency, total_amount, paid_by_traveler_id)
  values (seed_trip_id, 'Flight', 'Flight tickets', 'MYR', 900, julian_id)
  returning id into expense_id;

  insert into public.expense_splits (trip_id, trip_expense_id, traveler_id, amount)
  values (seed_trip_id, expense_id, julian_id, 450), (seed_trip_id, expense_id, clarrie_id, 450);

  return seed_trip_id;
end;
$$;

grant execute on function public.create_seed_trip() to authenticated;
