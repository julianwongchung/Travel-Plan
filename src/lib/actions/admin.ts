"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { authedAdminClient, value } from "@/lib/actions/helpers";
import type { AppRole } from "@/lib/db/types";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeEmail } from "@/lib/utils/email";

const appRoleSchema = z.enum(["admin", "viewer"]);
const passwordSchema = z.string().min(8, "Password must be at least 8 characters.");

function roleFromFormData(formData: FormData): AppRole {
  return appRoleSchema.parse(value(formData, "app_role", "viewer"));
}

export async function createAppUser(formData: FormData) {
  await authedAdminClient();

  const email = normalizeEmail(value(formData, "email"));
  const password = passwordSchema.parse(value(formData, "password"));
  const fullName = value(formData, "full_name") || null;
  const appRole = roleFromFormData(formData);
  const adminClient = createAdminClient();

  const { data, error } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
    },
  });

  if (error) {
    throw new Error(error.message);
  }

  if (!data.user) {
    throw new Error("Unable to create user account.");
  }

  const { error: profileError } = await adminClient.from("profiles").upsert({
    id: data.user.id,
    email,
    full_name: fullName,
    app_role: appRole,
    is_active: true,
  });

  if (profileError) {
    throw new Error(profileError.message);
  }

  revalidatePath("/admin");
}

export async function updateAppUserRole(userId: string, formData: FormData) {
  const supabase = await authedAdminClient();
  const { data } = await supabase.auth.getUser();
  const appRole = roleFromFormData(formData);

  if (data.user?.id === userId && appRole !== "admin") {
    throw new Error("You cannot remove your own admin access.");
  }

  const adminClient = createAdminClient();
  const { error } = await adminClient
    .from("profiles")
    .update({ app_role: appRole })
    .eq("id", userId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin");
}

export async function updateAppUserActive(userId: string, isActive: boolean) {
  const supabase = await authedAdminClient();
  const { data } = await supabase.auth.getUser();

  if (data.user?.id === userId && !isActive) {
    throw new Error("You cannot deactivate your own account.");
  }

  const adminClient = createAdminClient();
  const { error } = await adminClient
    .from("profiles")
    .update({ is_active: isActive })
    .eq("id", userId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin");
}

export async function deleteAppUser(userId: string) {
  const supabase = await authedAdminClient();
  const { data } = await supabase.auth.getUser();

  if (data.user?.id === userId) {
    throw new Error("You cannot delete your own account.");
  }

  const adminClient = createAdminClient();
  const { count: ownedTripCount, error: ownedTripError } = await adminClient
    .from("trips")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", userId);

  if (ownedTripError) {
    throw new Error(ownedTripError.message);
  }

  if ((ownedTripCount ?? 0) > 0) {
    throw new Error("Transfer this user's trips before deleting the user account.");
  }

  const { error } = await adminClient.auth.admin.deleteUser(userId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin");
}
