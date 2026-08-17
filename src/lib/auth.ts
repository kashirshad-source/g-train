import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Role } from "@/lib/supabase/types";

// Layouts and the pages they wrap each call one of the functions below on
// every request, and middleware already ran its own auth check before any
// of this runs — cache() dedupes the getUser()/profile round trip so it
// only actually hits Supabase once per request no matter how many times
// it's called across the layout/page tree.
const getAuthedUserAndProfile = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { supabase, user: null, profile: null };

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return { supabase, user, profile };
});

export async function requireUserWithRole(role: Role) {
  const { supabase, user, profile } = await getAuthedUserAndProfile();
  if (!user) redirect("/");

  if (!profile?.default_role) redirect("/onboarding");
  if (profile.must_change_password) redirect("/change-password");
  if (profile.default_role !== role) {
    redirect(profile.default_role === "trainer" ? "/trainer/dashboard" : "/client/dashboard");
  }

  return { supabase, user, profile };
}

export async function requireAdmin() {
  const { supabase, user, profile } = await getAuthedUserAndProfile();
  if (!user) redirect("/");

  if (!profile?.is_admin) redirect("/");
  if (profile.must_change_password) redirect("/change-password");

  return { supabase, user, profile };
}

export async function requireProfile() {
  const { supabase, user, profile } = await getAuthedUserAndProfile();
  if (!user) redirect("/");

  if (!profile?.default_role) redirect("/onboarding");
  if (profile.must_change_password) redirect("/change-password");

  return { supabase, user, profile };
}
