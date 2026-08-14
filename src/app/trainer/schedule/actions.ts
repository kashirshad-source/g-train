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

export async function markBookingComplete(id: string) {
  const supabase = await createClient();
  await supabase.from("bookings").update({ status: "completed" }).eq("id", id);
  revalidatePath("/trainer/schedule");
  revalidatePath("/trainer/dashboard");
  revalidatePath("/client/dashboard");
}

export async function cancelBooking(id: string, offerSlot: boolean) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { data: booking } = await supabase
    .from("bookings")
    .select("location_id, start_time, end_time")
    .eq("id", id)
    .single();

  await supabase.from("bookings").update({ status: "cancelled" }).eq("id", id);
  await supabase.rpc("notify_booking_cancelled", { p_booking_id: id });

  if (offerSlot && booking) {
    const { data: offer } = await supabase
      .from("slot_offers")
      .insert({
        trainer_id: user.id,
        location_id: booking.location_id,
        start_time: booking.start_time,
        end_time: booking.end_time,
        source_booking_id: id,
      })
      .select("id")
      .single();
    if (offer) {
      await supabase.rpc("notify_slot_offer_available", { p_slot_offer_id: offer.id });
    }
  }

  revalidatePath("/trainer/schedule");
  revalidatePath("/trainer/dashboard");
  revalidatePath("/client/dashboard");
}

// Lets a trainer post the slot from a booking a *client* cancelled — the
// action behind the "Offer this slot" button on that cancellation
// notification. Guards against double-offering the same freed time if the
// trainer opens the notification again after already offering it once.
export async function offerSlotFromCancelledBooking(bookingId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { data: booking } = await supabase
    .from("bookings")
    .select("location_id, start_time, end_time, trainer_id")
    .eq("id", bookingId)
    .single();
  if (!booking || booking.trainer_id !== user.id) return { error: "Couldn't offer that slot." };

  const { data: existing } = await supabase
    .from("slot_offers")
    .select("id")
    .eq("source_booking_id", bookingId)
    .in("status", ["open", "filled"])
    .maybeSingle();
  if (existing) return {};

  const { data: offer, error } = await supabase
    .from("slot_offers")
    .insert({
      trainer_id: user.id,
      location_id: booking.location_id,
      start_time: booking.start_time,
      end_time: booking.end_time,
      source_booking_id: bookingId,
    })
    .select("id")
    .single();
  if (error || !offer) return { error: "Couldn't offer that slot." };

  await supabase.rpc("notify_slot_offer_available", { p_slot_offer_id: offer.id });

  revalidatePath("/trainer/schedule");
  revalidatePath("/client/dashboard");
  return {};
}

export async function confirmSlotOffer(
  offerId: string,
  clientId: string,
  locationId: string,
  startTime: string,
  endTime: string
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { data: newBooking, error } = await supabase
    .from("bookings")
    .insert({
      trainer_id: user.id,
      client_id: clientId,
      location_id: locationId,
      start_time: startTime,
      end_time: endTime,
      status: "confirmed",
    })
    .select("id")
    .single();
  if (error || !newBooking) return { error: "Couldn't confirm that booking. Try again." };

  await supabase
    .from("slot_offers")
    .update({ status: "filled", filled_booking_id: newBooking.id })
    .eq("id", offerId);
  await supabase.rpc("notify_slot_offer_result", {
    p_slot_offer_id: offerId,
    p_winning_client_id: clientId,
  });

  revalidatePath("/trainer/schedule");
  revalidatePath("/trainer/dashboard");
  revalidatePath("/client/dashboard");
  return {};
}

export async function closeSlotOffer(offerId: string) {
  const supabase = await createClient();
  await supabase.from("slot_offers").update({ status: "closed" }).eq("id", offerId);
  revalidatePath("/trainer/schedule");
}
