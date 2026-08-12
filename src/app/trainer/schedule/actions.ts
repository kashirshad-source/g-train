"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function addAvailability(formData: FormData) {
  const locationId = formData.get("location_id") as string;
  const date = formData.get("date") as string;
  const startTime = formData.get("start_time") as string;
  const endTime = formData.get("end_time") as string;

  if (!locationId || !date || !startTime || !endTime) return { error: "Missing fields" };
  if (endTime <= startTime) return { error: "End time must be after start time" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };

  const { error } = await supabase.from("availability").insert({
    trainer_id: user.id,
    location_id: locationId,
    date,
    start_time: startTime,
    end_time: endTime,
  });

  if (error) return { error: "Couldn't save those hours. Try again." };

  revalidatePath("/trainer/schedule");
}

export async function deleteAvailability(id: string) {
  const supabase = await createClient();
  await supabase.from("availability").delete().eq("id", id);
  revalidatePath("/trainer/schedule");
}

export async function addRecurringBlock(formData: FormData) {
  const locationId = formData.get("location_id") as string;
  const dayOfWeek = Number(formData.get("day_of_week"));
  const startTime = formData.get("start_time") as string;
  const endTime = formData.get("end_time") as string;
  const label = (formData.get("label") as string)?.trim();
  const endsOn = (formData.get("ends_on") as string)?.trim();

  if (!locationId || Number.isNaN(dayOfWeek) || !startTime || !endTime) {
    return { error: "Missing fields" };
  }
  if (endTime <= startTime) return { error: "End time must be after start time" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };

  const { error } = await supabase.from("recurring_blocks").insert({
    trainer_id: user.id,
    location_id: locationId,
    day_of_week: dayOfWeek,
    start_time: startTime,
    end_time: endTime,
    label: label || null,
    ends_on: endsOn || null,
  });

  if (error) return { error: "Couldn't save that. Try again." };

  revalidatePath("/trainer/schedule");
}

export async function deleteRecurringBlock(id: string) {
  const supabase = await createClient();
  await supabase.from("recurring_blocks").delete().eq("id", id);
  revalidatePath("/trainer/schedule");
}

export async function updateBookingStatus(id: string, status: "cancelled" | "completed") {
  const supabase = await createClient();
  await supabase.from("bookings").update({ status }).eq("id", id);
  revalidatePath("/trainer/schedule");
  revalidatePath("/trainer/dashboard");
  revalidatePath("/client/dashboard");
}
