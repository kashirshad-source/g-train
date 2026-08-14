"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { normalizePhone } from "@/lib/phone";

export async function generateTrainerInvite(
  name: string,
  phone: string
): Promise<{ code?: string; error?: string }> {
  const { supabase, user } = await requireAdmin();

  if (!name.trim()) return { error: "Enter their name." };

  const normalized = normalizePhone(phone);
  if (normalized.length !== 10) return { error: "Enter a valid phone number." };

  const { data, error } = await supabase
    .from("admin_trainer_invites")
    .insert({ name: name.trim(), phone: normalized, created_by: user.id })
    .select("code")
    .single();

  if (error || !data) return { error: "Couldn't create the invite. Try again." };

  revalidatePath("/admin");
  return { code: data.code };
}
