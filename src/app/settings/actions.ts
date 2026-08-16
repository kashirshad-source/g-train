"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizePhone } from "@/lib/phone";

export async function updateProfile(formData: FormData) {
  const fullName = (formData.get("full_name") as string)?.trim();
  const phoneRaw = (formData.get("phone") as string)?.trim();
  const phone = phoneRaw ? normalizePhone(phoneRaw) : "";
  const avatarUrl = (formData.get("avatar_url") as string)?.trim();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("profiles")
    .update({
      full_name: fullName || null,
      phone: phone.length === 10 ? phone : null,
      ...(avatarUrl ? { avatar_url: avatarUrl } : {}),
    })
    .eq("id", user.id);
  revalidatePath("/settings");
}

export async function changePassword(formData: FormData): Promise<{ error?: string }> {
  const password = formData.get("password") as string;
  const confirm = formData.get("confirm") as string;

  if (password.length < 6) return { error: "Password must be at least 6 characters." };
  if (password !== confirm) return { error: "Passwords don't match." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: "Couldn't update your password. Try again." };

  // A plain user update can't clear this flag (see protect_profile_flags_trigger)
  // — it's only allowed via the service-role client, and only reached here
  // after the password rotation above has actually succeeded.
  const admin = createAdminClient();
  await admin.from("profiles").update({ must_change_password: false }).eq("id", user.id);
  return {};
}
