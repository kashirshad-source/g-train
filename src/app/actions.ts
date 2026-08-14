"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { format } from "date-fns";

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

export interface NotificationItem {
  id: string;
  body: string;
  href: string;
  createdAt: string;
  readAt: string | null;
  // Set only for a "client cancelled" notification the recipient trainer
  // hasn't already re-offered — the id to pass to offerSlotFromCancelledBooking.
  offerableBookingId: string | null;
}

export async function getMyNotifications(): Promise<{
  items: NotificationItem[];
  unreadCount: number;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { items: [], unreadCount: 0 };

  const [{ data: notifications }, { data: myProfile }] = await Promise.all([
    supabase
      .from("notifications")
      .select("id, type, actor_id, booking_id, slot_offer_id, read_at, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase.from("profiles").select("default_role").eq("id", user.id).single(),
  ]);

  const rows = notifications ?? [];
  if (rows.length === 0) return { items: [], unreadCount: 0 };

  const isTrainer = myProfile?.default_role === "trainer";
  const myHref = isTrainer ? "/trainer/schedule" : "/client/dashboard";

  const bookingIds = [...new Set(rows.map((r) => r.booking_id).filter((id): id is string => !!id))];
  const slotOfferIds = [...new Set(rows.map((r) => r.slot_offer_id).filter((id): id is string => !!id))];
  const actorIds = [...new Set(rows.map((r) => r.actor_id))];

  const cancelledBookingIds = isTrainer
    ? rows.filter((r) => r.type === "booking_cancelled" && r.booking_id).map((r) => r.booking_id as string)
    : [];

  const [{ data: bookings }, { data: slotOffers }, { data: actors }, { data: alreadyOffered }] =
    await Promise.all([
      bookingIds.length > 0
        ? supabase.from("bookings").select("id, start_time, location_id").in("id", bookingIds)
        : Promise.resolve({ data: [] as { id: string; start_time: string; location_id: string }[] }),
      slotOfferIds.length > 0
        ? supabase.from("slot_offers").select("id, start_time, location_id").in("id", slotOfferIds)
        : Promise.resolve({ data: [] as { id: string; start_time: string; location_id: string }[] }),
      supabase.from("profiles").select("id, full_name, email").in("id", actorIds),
      cancelledBookingIds.length > 0
        ? supabase
            .from("slot_offers")
            .select("source_booking_id")
            .in("source_booking_id", cancelledBookingIds)
            .in("status", ["open", "filled"])
        : Promise.resolve({ data: [] as { source_booking_id: string | null }[] }),
    ]);

  const alreadyOfferedBookingIds = new Set(
    (alreadyOffered ?? []).map((o) => o.source_booking_id).filter((id): id is string => !!id)
  );

  const locationIds = [
    ...new Set([...(bookings ?? []), ...(slotOffers ?? [])].map((b) => b.location_id)),
  ];
  const { data: locations } =
    locationIds.length > 0
      ? await supabase.from("locations").select("id, name").in("id", locationIds)
      : { data: [] as { id: string; name: string }[] };

  const bookingById = new Map((bookings ?? []).map((b) => [b.id, b]));
  const slotOfferById = new Map((slotOffers ?? []).map((o) => [o.id, o]));
  const locationById = new Map((locations ?? []).map((l) => [l.id, l]));
  const actorById = new Map((actors ?? []).map((a) => [a.id, a]));

  const items = rows.map((row) => {
    const actor = actorById.get(row.actor_id);
    const actorName = actor?.full_name ?? actor?.email ?? "Someone";
    const booking = row.booking_id ? bookingById.get(row.booking_id) : undefined;
    const slotOffer = row.slot_offer_id ? slotOfferById.get(row.slot_offer_id) : undefined;
    const when = booking ?? slotOffer;
    const location = when ? locationById.get(when.location_id) : undefined;
    const dateStr = when ? format(new Date(when.start_time), "EEE MMM d, h:mm a") : "";
    const atLocation = location ? ` at ${location.name}` : "";

    let body: string;
    switch (row.type) {
      case "slot_offer_available":
        body = `${actorName} has an open slot on ${dateStr}${atLocation}.`;
        break;
      case "slot_offer_requested":
        body = `${actorName} requested your open slot on ${dateStr}${atLocation}.`;
        break;
      case "slot_offer_confirmed":
        body = `${actorName} confirmed your slot on ${dateStr}${atLocation}.`;
        break;
      case "slot_offer_unavailable":
        body = `The slot on ${dateStr}${atLocation} was already taken.`;
        break;
      default:
        body = booking
          ? `${actorName} cancelled the session on ${dateStr}${atLocation}.`
          : `${actorName} cancelled a session.`;
    }

    const offerableBookingId =
      isTrainer &&
      row.type === "booking_cancelled" &&
      row.booking_id &&
      !alreadyOfferedBookingIds.has(row.booking_id)
        ? row.booking_id
        : null;

    return {
      id: row.id,
      body,
      href: myHref,
      createdAt: row.created_at,
      readAt: row.read_at,
      offerableBookingId,
    };
  });

  const unreadCount = rows.filter((r) => !r.read_at).length;
  return { items, unreadCount };
}

export async function markNotificationsRead() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .is("read_at", null);
}
