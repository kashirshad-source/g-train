"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { normalizePhone } from "@/lib/phone";

// Sets the profile's role, phone, and optionally its avatar. Phone is
// collected right here (not deferred to Settings) so this update fires
// on_profile_phone_set immediately, matching any pending text invite for
// this number right at signup. It also fires on_profile_role_set, which
// joins every base (shared) location automatically.
export async function completeOnboarding(formData: FormData) {
  const role = formData.get("role") as "trainer" | "client";
  const avatarUrl = (formData.get("avatar_url") as string)?.trim();
  const phone = normalizePhone((formData.get("phone") as string) ?? "");
  const activationCode = (formData.get("activation_code") as string)?.trim().toLowerCase();

  if ((role !== "trainer" && role !== "client") || phone.length !== 10) {
    redirect("/onboarding?error=missing_fields");
  }
  if (role === "trainer" && !activationCode) {
    redirect("/onboarding?error=missing_fields");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  if (role === "trainer") {
    const { data: redeemed } = await supabase.rpc("redeem_trainer_activation_code", {
      p_code: activationCode,
      p_user_id: user.id,
    });
    if (!redeemed) redirect("/onboarding?error=invalid_code");
  }

  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      default_role: role,
      phone,
      ...(avatarUrl ? { avatar_url: avatarUrl } : {}),
    })
    .eq("id", user.id);
  if (profileError) redirect("/onboarding?error=profile_update_failed");

  redirect(role === "trainer" ? "/trainer/dashboard" : "/client/dashboard");
}
