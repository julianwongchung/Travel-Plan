import { redirect } from "next/navigation";
import { ensureCurrentProfile } from "@/lib/db/profiles";
import { createClient } from "@/lib/supabase/server";

export function value(formData: FormData, key: string, fallback = "") {
  return String(formData.get(key) ?? fallback).trim();
}

export function nullable(formData: FormData, key: string) {
  const text = value(formData, key);
  return text.length > 0 ? text : null;
}

export async function authedClient() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");
  return supabase;
}

export async function authedActiveClient() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");

  const profile = await ensureCurrentProfile(supabase, data.user);
  if (!profile.is_active) {
    throw new Error("Access denied. Your account is inactive.");
  }

  return supabase;
}

export async function authedAdminClient() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");

  const profile = await ensureCurrentProfile(supabase, data.user);

  if (!profile.is_active || profile.app_role !== "admin") {
    throw new Error("Access denied. Admin permission is required.");
  }

  return supabase;
}
