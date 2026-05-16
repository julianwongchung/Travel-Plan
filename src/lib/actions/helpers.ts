import { redirect } from "next/navigation";
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
