export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Role = "owner" | "editor" | "viewer";
export type TripStatus = "planning" | "active" | "completed" | "archived";
export type Currency = "MYR" | "SGD" | "USD" | "VND" | "THB" | "IDR" | "PHP" | "JPY" | "KRW" | "TWD" | "HKD";
export type PlaceType = "food" | "hotel" | "attraction" | "shopping" | "transport";
export type PlacePriority = "must-go" | "nice-to-have" | "skip";

export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string | null;
};

export type Trip = {
  id: string;
  owner_id: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
  default_currency: Currency;
  trip_status: TripStatus;
  deleted_at: string | null;
  deleted_by: string | null;
  created_at: string;
  updated_at: string | null;
};

export type TripMember = {
  id: string;
  trip_id: string;
  user_id: string;
  role: Role;
  created_at: string;
  profiles?: Pick<Profile, "email" | "full_name"> | null;
};

export type TripInvitation = {
  id: string;
  trip_id: string;
  invited_email: string;
  role: Exclude<Role, "owner">;
  invited_by: string;
  status: "pending" | "accepted" | "cancelled";
  accepted_at: string | null;
  created_at: string;
};

export type Traveler = {
  id: string;
  trip_id: string;
  name: string;
  deleted_at: string | null;
  deleted_by: string | null;
  created_at: string;
  updated_at: string | null;
};

export type TripDay = {
  id: string;
  trip_id: string;
  date: string;
  day_number: number | null;
  route: string | null;
  hotel_name: string | null;
  hotel_link: string | null;
  remark: string | null;
  created_at: string;
  updated_at: string | null;
};

export type ScheduleItem = {
  id: string;
  trip_id: string;
  trip_day_id: string;
  time_block: string | null;
  title: string;
  description: string | null;
  transport: string | null;
  food: string | null;
  notes: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string | null;
};

export type Place = {
  id: string;
  trip_id: string;
  name: string;
  type: PlaceType;
  area: string | null;
  google_map_link: string | null;
  notes: string | null;
  priority: PlacePriority | null;
  rating: number | null;
  planned_date: string | null;
  planned_time: string | null;
  deleted_at: string | null;
  deleted_by: string | null;
  created_at: string;
  updated_at: string | null;
};

export type TripHotel = {
  id: string;
  trip_id: string;
  name: string;
  location: string;
  check_in_date: string;
  check_out_date: string;
  notes: string | null;
  created_by: string;
  deleted_at: string | null;
  deleted_by: string | null;
  created_at: string;
  updated_at: string | null;
};

export type TripFlight = {
  id: string;
  trip_id: string;
  flight_number: string;
  flight_date: string;
  flight_time: string;
  passenger_name: string;
  departure: string;
  arrival: string;
  notes: string | null;
  created_by: string;
  deleted_at: string | null;
  deleted_by: string | null;
  created_at: string;
  updated_at: string | null;
};

export type TripExpense = {
  id: string;
  trip_id: string;
  category: string | null;
  expense_name: string;
  currency: Currency;
  total_amount: number;
  paid_by_traveler_id: string | null;
  expense_date: string | null;
  expense_time: string | null;
  notes: string | null;
  deleted_at: string | null;
  deleted_by: string | null;
  created_at: string;
  updated_at: string | null;
};

export type ExpenseSplit = {
  id: string;
  trip_id: string;
  trip_expense_id: string;
  traveler_id: string;
  amount: number;
  created_at: string;
};

type Table<T> = {
  Row: T;
  Insert: Partial<T>;
  Update: Partial<T>;
};

export type Database = {
  public: {
    Tables: {
      profiles: Table<Profile>;
      trips: Table<Trip>;
      trip_members: Table<TripMember>;
      trip_invitations: Table<TripInvitation>;
      travelers: Table<Traveler>;
      trip_days: Table<TripDay>;
      schedule_items: Table<ScheduleItem>;
      places: Table<Place>;
      trip_hotels: Table<TripHotel>;
      trip_flights: Table<TripFlight>;
      trip_expenses: Table<TripExpense>;
      expense_splits: Table<ExpenseSplit>;
    };
    Views: Record<string, never>;
    Functions: {
      create_trip: { Args: { p_name: string; p_start_date: string | null; p_end_date: string | null; p_default_currency: Currency }; Returns: string };
      create_trip_with_travelers: { Args: { p_name: string; p_start_date: string | null; p_end_date: string | null; p_default_currency: Currency; p_traveler_names: string[] }; Returns: string };
      update_trip: { Args: { p_trip_id: string; p_name: string; p_start_date: string | null; p_end_date: string | null; p_default_currency: Currency }; Returns: void };
      complete_trip: { Args: { p_trip_id: string }; Returns: void };
      archive_trip: { Args: { p_trip_id: string }; Returns: void };
      restore_archived_trip: { Args: { p_trip_id: string }; Returns: void };
      soft_delete_trip: { Args: { p_trip_id: string }; Returns: void };
      restore_deleted_trip: { Args: { p_trip_id: string }; Returns: void };
      leave_trip: { Args: { p_trip_id: string }; Returns: void };
      invite_trip_member: { Args: { p_trip_id: string; p_email: string; p_role: "editor" | "viewer" }; Returns: string };
      remove_trip_member: { Args: { p_member_id: string }; Returns: void };
      update_trip_member_role: { Args: { p_member_id: string; p_role: "editor" | "viewer" }; Returns: void };
      cancel_trip_invitation: { Args: { p_invitation_id: string }; Returns: void };
      add_traveler: { Args: { p_trip_id: string; p_name: string }; Returns: string };
      ensure_trip_day: { Args: { p_trip_id: string; p_date: string; p_day_number: number | null }; Returns: string };
      create_schedule_item: { Args: { p_trip_id: string; p_trip_day_id: string | null; p_trip_day_date: string | null; p_trip_day_number: number | null; p_time_block: string | null; p_title: string; p_description: string | null; p_transport: string | null; p_food: string | null; p_notes: string | null }; Returns: string };
      get_trip_cards: { Args: Record<string, never>; Returns: Array<Trip & { role: Role; owner_email: string | null; traveler_count: number; member_count: number }> };
      create_place: { Args: { p_trip_id: string; p_name: string; p_type: PlaceType; p_area: string | null; p_google_map_link: string | null; p_notes: string | null; p_priority: PlacePriority; p_rating: number | null; p_planned_date: string | null; p_planned_time: string | null }; Returns: string };
      update_place: { Args: { p_place_id: string; p_name: string; p_type: PlaceType; p_area: string | null; p_google_map_link: string | null; p_notes: string | null; p_priority: PlacePriority; p_rating: number | null }; Returns: void };
      soft_delete_place: { Args: { p_place_id: string }; Returns: void };
      restore_place: { Args: { p_place_id: string }; Returns: void };
      create_trip_hotel: { Args: { p_trip_id: string; p_name: string; p_location: string; p_check_in_date: string; p_check_out_date: string; p_notes: string | null }; Returns: string };
      soft_delete_trip_hotel: { Args: { p_hotel_id: string }; Returns: void };
      create_trip_flight: { Args: { p_trip_id: string; p_flight_number: string; p_flight_date: string; p_flight_time: string; p_passenger_name: string; p_departure: string; p_arrival: string; p_notes: string | null }; Returns: string };
      soft_delete_trip_flight: { Args: { p_flight_id: string }; Returns: void };
      create_expense: { Args: { p_trip_id: string; p_category: string; p_expense_name: string; p_currency: Currency; p_total_amount: number; p_paid_by_traveler_id: string | null; p_splits: Json; p_expense_date: string | null; p_expense_time: string | null; p_notes: string | null }; Returns: string };
      update_expense: { Args: { p_expense_id: string; p_category: string; p_expense_name: string; p_currency: Currency; p_total_amount: number; p_paid_by_traveler_id: string | null; p_splits: Json; p_expense_date: string | null; p_expense_time: string | null; p_notes: string | null }; Returns: void };
      soft_delete_expense: { Args: { p_expense_id: string }; Returns: void };
      restore_expense: { Args: { p_expense_id: string }; Returns: void };
      delete_schedule_item: { Args: { p_schedule_item_id: string }; Returns: void };
      update_schedule_item: { Args: { p_schedule_item_id: string; p_time_block: string | null; p_title: string; p_description: string | null; p_transport: string | null; p_food: string | null; p_notes: string | null }; Returns: void };
      reorder_schedule_items: { Args: { p_trip_id: string; p_trip_day_id: string; p_schedule_item_ids: string[] }; Returns: void };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
