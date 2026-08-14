"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function cancelBooking(id: string) {
  const supabase = await createClient();
  await supabase.from("bookings").update({ status: "cancelled" }).eq("id", id);
  await supabase.rpc("notify_booking_cancelled", { p_booking_id: id });
  revalidatePath("/client/dashboard");
  revalidatePath("/trainer/dashboard");
  revalidatePath("/trainer/schedule");
}

export async function requestSlotOffer(offerId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { error } = await supabase
    .from("slot_offer_requests")
    .insert({ slot_offer_id: offerId, client_id: user.id });

  // 23505 = already requested this one — not a real error to the user.
  if (error && error.code !== "23505") return { error: "Couldn't request that slot." };

  if (!error) {
    await supabase.rpc("notify_slot_offer_requested", { p_slot_offer_id: offerId });
  }

  revalidatePath("/client/dashboard");
  return {};
}

export async function bookSession(formData: FormData) {
  const trainerId = formData.get("trainer_id") as string;
  const locationId = formData.get("location_id") as string;
  const start = formData.get("start") as string;
  const end = formData.get("end") as string;

  if (!trainerId || !locationId || !start || !end) {
    return { error: "Missing booking details." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { error } = await supabase.from("bookings").insert({
    trainer_id: trainerId,
    location_id: locationId,
    client_id: user.id,
    start_time: start,
    end_time: end,
    status: "confirmed",
  });

  if (error) return { error: "That slot is no longer available." };

  // First booking with this trainer at this location puts the client on
  // their roster, same as accepting a text invite would.
  await supabase.from("client_rosters").upsert(
    { trainer_id: trainerId, client_id: user.id, location_id: locationId },
    { onConflict: "trainer_id,client_id,location_id", ignoreDuplicates: true }
  );

  revalidatePath("/client/dashboard");
  revalidatePath("/client/book");
  revalidatePath("/trainer/dashboard");
  revalidatePath("/trainer/schedule");
  return { error: null };
}
