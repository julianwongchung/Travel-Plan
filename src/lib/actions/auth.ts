"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { normalizeEmail } from "@/lib/utils/email";
import { value } from "@/lib/actions/helpers";

export async function login(formData: FormData) {
  const supabase = await createClient();
  const email = normalizeEmail(value(formData, "email"));
  const password = value(formData, "password");

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    redirect(`/login?error=${encodeURIComponent("Invalid login details.")}`);
  }

  await supabase.rpc("accept_pending_invitations");
  redirect("/trips");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
