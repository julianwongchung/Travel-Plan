import type { SupabaseClient, User } from "@supabase/supabase-js";
import type { AppRole, Profile } from "@/lib/db/types";

type CurrentProfile = Pick<Profile, "id" | "email" | "full_name" | "avatar_url" | "app_role" | "is_active" | "created_at" | "updated_at">;

function appRoleFromValue(value: unknown): AppRole {
  return value === "admin" ? "admin" : "viewer";
}

function metadataText(user: User, key: string) {
  const value = user.user_metadata?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function profileSetupError(message?: string) {
  return new Error(message || "Unable to load your user profile. Apply the latest RBAC migrations, then try logging in again.");
}

export async function ensureCurrentProfile(supabase: SupabaseClient, user: User): Promise<CurrentProfile> {
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id,email,full_name,avatar_url,app_role,is_active,created_at,updated_at")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    throw profileSetupError(error.message);
  }

  if (profile) {
    return {
      ...profile,
      app_role: appRoleFromValue(profile.app_role),
      is_active: Boolean(profile.is_active),
    } as CurrentProfile;
  }

  const email = user.email?.trim().toLowerCase();
  if (!email) {
    throw profileSetupError("Your login account does not have an email address.");
  }

  const { data: createdProfile, error: createError } = await supabase
    .from("profiles")
    .insert({
      id: user.id,
      email,
      full_name: metadataText(user, "full_name"),
      avatar_url: metadataText(user, "avatar_url"),
      app_role: "viewer",
      is_active: true,
    })
    .select("id,email,full_name,avatar_url,app_role,is_active,created_at,updated_at")
    .single();

  if (createError || !createdProfile) {
    throw profileSetupError(createError?.message);
  }

  return {
    ...createdProfile,
    app_role: appRoleFromValue(createdProfile.app_role),
    is_active: Boolean(createdProfile.is_active),
  } as CurrentProfile;
}
