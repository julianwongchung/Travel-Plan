"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { authedClient, value } from "@/lib/actions/helpers";
import { normalizeEmail } from "@/lib/utils/email";

const roleSchema = z.enum(["editor", "viewer"]);

export async function inviteTripMember(tripId: string, formData: FormData) {
  const supabase = await authedClient();
  const { error } = await supabase.rpc("invite_trip_member", {
    p_trip_id: tripId,
    p_email: normalizeEmail(value(formData, "email")),
    p_role: roleSchema.parse(value(formData, "role", "viewer")),
  });

  if (error) throw new Error(error.message);
  revalidatePath(`/trips/${tripId}`);
}

export async function updateTripMemberRole(tripId: string, memberId: string, formData: FormData) {
  const supabase = await authedClient();
  const { error } = await supabase.rpc("update_trip_member_role", {
    p_member_id: memberId,
    p_role: roleSchema.parse(value(formData, "role", "viewer")),
  });

  if (error) throw new Error(error.message);
  revalidatePath(`/trips/${tripId}`);
}

export async function removeTripMember(tripId: string, memberId: string) {
  const supabase = await authedClient();
  const { error } = await supabase.rpc("remove_trip_member", { p_member_id: memberId });
  if (error) throw new Error(error.message);
  revalidatePath(`/trips/${tripId}`);
}

export async function cancelTripInvitation(tripId: string, invitationId: string) {
  const supabase = await authedClient();
  const { error } = await supabase.rpc("cancel_trip_invitation", { p_invitation_id: invitationId });
  if (error) throw new Error(error.message);
  revalidatePath(`/trips/${tripId}`);
}
