"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { buildSlotsForDay } from "@/lib/slots";

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

/** The trainer's own real open slots for a location/day — their published
 * hours minus existing bookings and recurring commitments. Used for the
 * quick-pick buttons; booking outside these still works via the custom-time
 * fallback, since a trainer isn't limited to their own published hours. */
export async function getTrainerOpenSlots(locationId: string, dateISO: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: availability } = await supabase
    .from("availability")
    .select("start_time, end_time")
    .eq("trainer_id", user.id)
    .eq("location_id", locationId)
    .eq("date", dateISO);

  const dayStart = new Date(`${dateISO}T00:00:00`);
  const dayEnd = new Date(`${dateISO}T23:59:59`);

  const { data: bookings } = await supabase
    .from("bookings")
    .select("start_time, end_time")
    .eq("trainer_id", user.id)
    .neq("status", "cancelled")
    .gte("start_time", dayStart.toISOString())
    .lte("start_time", dayEnd.toISOString());

  const { data: blocks } = await supabase.rpc("recurring_blocks_for_date", {
    p_trainer_id: user.id,
    p_location_id: locationId,
    p_date: dateISO,
  });
  const blockedRanges = (blocks ?? []).map((b) => ({
    start_time: `${dateISO}T${b.start_time}`,
    end_time: `${dateISO}T${b.end_time}`,
  }));

  return buildSlotsForDay(availability ?? [], [...(bookings ?? []), ...blockedRanges], dateISO);
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

  // The client picker only ever shows rostered clients, but the action
  // itself didn't enforce that — someone hitting it directly could name any
  // client in the system. Confirm this client is actually this trainer's.
  const { data: roster } = await supabase
    .from("client_rosters")
    .select("client_id")
    .eq("trainer_id", user.id)
    .eq("client_id", clientId)
    .eq("location_id", locationId)
    .maybeSingle();
  if (!roster) return { error: "That client isn't on your roster at this location." };

  // Neither the UI nor the DB previously checked for a double-booking —
  // a trainer could silently book two clients into the same time.
  const { data: conflicts } = await supabase
    .from("bookings")
    .select("id")
    .eq("trainer_id", user.id)
    .neq("status", "cancelled")
    .lt("start_time", end)
    .gt("end_time", start)
    .limit(1);
  if (conflicts && conflicts.length > 0) {
    return { error: "You already have a session booked at that time." };
  }

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
  revalidatePath("/trainer/book");
  revalidatePath("/client/dashboard");
  return {};
}
