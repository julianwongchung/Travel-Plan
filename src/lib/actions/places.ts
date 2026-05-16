"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { authedClient, nullable, value } from "@/lib/actions/helpers";
import type { PlacePriority, PlaceType } from "@/lib/db/types";

const typeSchema = z.enum(["food", "hotel", "attraction", "shopping", "transport"]);
const prioritySchema = z.enum(["must-go", "nice-to-have", "skip"]);

export async function createPlace(tripId: string, formData: FormData) {
  const supabase = await authedClient();
  const { error } = await supabase.rpc("create_place", {
    p_trip_id: tripId,
    p_name: value(formData, "name"),
    p_type: typeSchema.parse(value(formData, "type", "food")) as PlaceType,
    p_area: nullable(formData, "area"),
    p_google_map_link: nullable(formData, "google_map_link"),
    p_notes: nullable(formData, "notes"),
    p_priority: prioritySchema.parse(value(formData, "priority", "nice-to-have")) as PlacePriority,
    p_rating: nullable(formData, "rating") ? Number(value(formData, "rating")) : null,
  });

  if (error) throw new Error(error.message);
  revalidatePath(`/trips/${tripId}/places`);
}

export async function updatePlace(tripId: string, placeId: string, formData: FormData) {
  const supabase = await authedClient();
  const { error } = await supabase.rpc("update_place", {
    p_place_id: placeId,
    p_name: value(formData, "name"),
    p_type: typeSchema.parse(value(formData, "type", "food")) as PlaceType,
    p_area: nullable(formData, "area"),
    p_google_map_link: nullable(formData, "google_map_link"),
    p_notes: nullable(formData, "notes"),
    p_priority: prioritySchema.parse(value(formData, "priority", "nice-to-have")) as PlacePriority,
    p_rating: nullable(formData, "rating") ? Number(value(formData, "rating")) : null,
  });

  if (error) throw new Error(error.message);
  revalidatePath(`/trips/${tripId}/places`);
}

export async function softDeletePlace(tripId: string, placeId: string) {
  const supabase = await authedClient();
  const { error } = await supabase.rpc("soft_delete_place", { p_place_id: placeId });
  if (error) throw new Error(error.message);
  revalidatePath(`/trips/${tripId}/places`);
}

export async function restorePlace(tripId: string, placeId: string) {
  const supabase = await authedClient();
  const { error } = await supabase.rpc("restore_place", { p_place_id: placeId });
  if (error) throw new Error(error.message);
  revalidatePath(`/trips/${tripId}/places`);
}
