"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function getTrainerAvailabilityRanges(locationId: string, dateISO: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("availability")
    .select("start_time, end_time")
    .eq("trainer_id", user.id)
    .eq("location_id", locationId)
    .eq("date", dateISO);

  return data ?? [];
}

export async function bookSessionAsTrainer(formData: FormData): Promise<{ error?: string }> {
  const locationId = formData.get("location_id") as string;
  const clientId = formData.get("client_id") as string;
  const start = formData.get("start") as string;
  const end = formData.get("end") as string;

  if (!locationId || !clientId || !start || !end) {
    return { error: "Fill in every field before booking." };
  }
  if (new Date(end) <= new Date(start)) {
    return { error: "End time must be after start time." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { error } = await supabase.from("bookings").insert({
    location_id: locationId,
    trainer_id: user.id,
    client_id: clientId,
    start_time: start,
    end_time: end,
    status: "confirmed",
  });

  if (error) return { error: "Couldn't book that session. Try again." };

  revalidatePath("/trainer/dashboard");
  revalidatePath("/trainer/schedule");
  revalidatePath("/client/dashboard");
  return {};
}
