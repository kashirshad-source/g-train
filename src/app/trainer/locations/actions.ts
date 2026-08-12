"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { normalizePhone } from "@/lib/phone";

export async function createLocation(formData: FormData): Promise<{ error?: string }> {
  const name = (formData.get("name") as string)?.trim();
  const address = (formData.get("address") as string)?.trim();
  if (!name) return { error: "Enter a location name." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { data: location, error } = await supabase
    .from("locations")
    .insert({ name, address: address || null, owner_id: user.id })
    .select("id")
    .single();
  if (error || !location) return { error: "Couldn't create the location. Try again." };

  const { error: memberError } = await supabase.from("location_members").insert({
    location_id: location.id,
    user_id: user.id,
    role: "trainer",
    status: "active",
  });
  if (memberError) return { error: "Couldn't add you to the new location. Try again." };

  revalidatePath("/trainer/locations");
  return {};
}

export async function removeMember(locationId: string, userId: string) {
  const supabase = await createClient();
  await supabase
    .from("location_members")
    .delete()
    .eq("location_id", locationId)
    .eq("user_id", userId);
  revalidatePath("/trainer/locations");
}

async function createLocationInvite(
  locationId: string,
  phone: string,
  role: "trainer" | "client"
): Promise<{ id?: string; error?: string }> {
  const normalized = normalizePhone(phone);
  if (normalized.length !== 10) return { error: "Enter a valid phone number." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { data, error } = await supabase
    .from("location_invites")
    .insert({ trainer_id: user.id, location_id: locationId, phone: normalized, role })
    .select("id")
    .single();

  if (error || !data) return { error: "Couldn't create the invite. Try again." };

  revalidatePath("/trainer/locations");
  return { id: data.id };
}

export async function createClientInvite(locationId: string, phone: string) {
  return createLocationInvite(locationId, phone, "client");
}

export async function createTrainerInvite(locationId: string, phone: string) {
  return createLocationInvite(locationId, phone, "trainer");
}

export async function deleteLocation(locationId: string) {
  const supabase = await createClient();
  // RLS also blocks this for base locations — this check just gives a clean
  // error instead of a silent no-op if someone bypasses the UI guard.
  const { data: location } = await supabase
    .from("locations")
    .select("is_base")
    .eq("id", locationId)
    .single();
  if (location?.is_base) {
    return { error: "This is a base location and can't be deleted." };
  }

  const { error } = await supabase.from("locations").delete().eq("id", locationId);
  if (error) return { error: "Couldn't delete this location. Try again." };

  revalidatePath("/trainer/locations");
  revalidatePath("/trainer/schedule");
  revalidatePath("/trainer/clients");
}
