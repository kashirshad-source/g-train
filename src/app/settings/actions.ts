"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
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
