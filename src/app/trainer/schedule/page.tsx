import { requireUserWithRole } from "@/lib/auth";
import { getMyLocations, getProfilesByIds } from "@/lib/queries";
import { ScheduleManager } from "./schedule-manager";

export default async function TrainerSchedulePage() {
  const { supabase, user } = await requireUserWithRole("trainer");

  const locations = await getMyLocations(supabase, user.id, "trainer");
  const locationIds = locations.map((l) => l.id);

  const availability =
    locationIds.length > 0
      ? (
          await supabase
            .from("availability")
            .select("*")
            .eq("trainer_id", user.id)
            .in("location_id", locationIds)
        ).data ?? []
      : [];

  const nowISO = new Date().toISOString();
  const bookings =
    locationIds.length > 0
      ? (
          await supabase
            .from("bookings")
            .select("*")
            .eq("trainer_id", user.id)
            .neq("status", "cancelled")
            .gte("start_time", nowISO)
            .order("start_time", { ascending: true })
        ).data ?? []
      : [];

  const { data: slotOffers } = await supabase
    .from("slot_offers")
    .select("*")
    .eq("trainer_id", user.id)
    .order("created_at", { ascending: false })
    .limit(30);

  const offerIds = (slotOffers ?? []).map((o) => o.id);
  const { data: slotOfferRequests } =
    offerIds.length > 0
      ? await supabase
          .from("slot_offer_requests")
          .select("*")
          .in("slot_offer_id", offerIds)
          .order("created_at", { ascending: true })
      : { data: [] };

  const clientIds = [
    ...new Set([
      ...bookings.map((b) => b.client_id),
      ...(slotOfferRequests ?? []).map((r) => r.client_id),
    ]),
  ];
  const clients = await getProfilesByIds(supabase, clientIds);

  const recurringBlocks =
    locationIds.length > 0
      ? (
          await supabase
            .from("recurring_blocks")
            .select("*")
            .eq("trainer_id", user.id)
            .in("location_id", locationIds)
        ).data ?? []
      : [];

  return (
    <ScheduleManager
      locations={locations}
      availability={availability}
      bookings={bookings}
      clients={clients}
      recurringBlocks={recurringBlocks}
      slotOffers={slotOffers ?? []}
      slotOfferRequests={slotOfferRequests ?? []}
    />
  );
}
