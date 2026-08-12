"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function leaveLocation(locationId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("location_members")
    .delete()
    .eq("location_id", locationId)
    .eq("user_id", user.id)
    .eq("role", "client");

  revalidatePath("/client/locations");
}
