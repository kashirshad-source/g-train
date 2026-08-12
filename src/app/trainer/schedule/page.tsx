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

  const clientIds = [...new Set(bookings.map((b) => b.client_id))];
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
    />
  );
}
