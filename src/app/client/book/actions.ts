"use server";

import { createClient } from "@/lib/supabase/server";
import { buildSlotsForDay } from "@/lib/slots";

export async function getAvailableSlots(trainerId: string, locationId: string, dateISO: string) {
  const supabase = await createClient();

  const { data: availability } = await supabase
    .from("availability")
    .select("start_time, end_time")
    .eq("trainer_id", trainerId)
    .eq("location_id", locationId)
    .eq("date", dateISO);

  const dayStart = new Date(`${dateISO}T00:00:00`);
  const dayEnd = new Date(`${dateISO}T23:59:59`);

  const { data: bookings } = await supabase
    .from("bookings")
    .select("start_time, end_time")
    .eq("trainer_id", trainerId)
    .neq("status", "cancelled")
    .gte("start_time", dayStart.toISOString())
    .lte("start_time", dayEnd.toISOString());

  const { data: blocks } = await supabase.rpc("recurring_blocks_for_date", {
    p_trainer_id: trainerId,
    p_location_id: locationId,
    p_date: dateISO,
  });
  const blockedRanges = (blocks ?? []).map((b) => ({
    start_time: `${dateISO}T${b.start_time}`,
    end_time: `${dateISO}T${b.end_time}`,
  }));

  return buildSlotsForDay(availability ?? [], [...(bookings ?? []), ...blockedRanges], dateISO);
}
