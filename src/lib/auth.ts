import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Role } from "@/lib/supabase/types";

export async function requireUserWithRole(role: Role) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile?.default_role) redirect("/onboarding");
  if (profile.must_change_password) redirect("/change-password");
  if (profile.default_role !== role) {
    redirect(profile.default_role === "trainer" ? "/trainer/dashboard" : "/client/dashboard");
  }

  return { supabase, user, profile };
}

export async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) redirect("/");
  if (profile.must_change_password) redirect("/change-password");

  return { supabase, user, profile };
}

export async function requireProfile() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile?.default_role) redirect("/onboarding");
  if (profile.must_change_password) redirect("/change-password");

  return { supabase, user, profile };
}
