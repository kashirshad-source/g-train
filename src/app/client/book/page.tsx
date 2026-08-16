import { requireUserWithRole } from "@/lib/auth";
import { getMyLocations, getLocationMembersByRole } from "@/lib/queries";
import { BookingFlow } from "./booking-flow";

export default async function ClientBookPage({
  searchParams,
}: {
  searchParams: Promise<{ location?: string; trainer?: string }>;
}) {
  const { location: locationParam, trainer: trainerParam } = await searchParams;
  const { supabase, user } = await requireUserWithRole("client");
  const locations = await getMyLocations(supabase, user.id, "client");

  const trainersByLocationEntries = await Promise.all(
    locations.map(
      async (location) => [location.id, await getLocationMembersByRole(supabase, location.id, "trainer")] as const
    )
  );
  const trainersByLocation = Object.fromEntries(trainersByLocationEntries);

  // Only honor the shortcut's query params if they actually match a
  // location/trainer this client can see — never trust them blindly.
  const initialLocationId = locations.some((l) => l.id === locationParam) ? locationParam : undefined;
  const initialTrainerId =
    initialLocationId && trainersByLocation[initialLocationId]?.some((t) => t.id === trainerParam)
      ? trainerParam
      : undefined;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold">Book a session</h1>
        <p className="text-muted-foreground">Pick a location, trainer, and time that works.</p>
      </div>
      <BookingFlow
        locations={locations}
        trainersByLocation={trainersByLocation}
        initialLocationId={initialLocationId}
        initialTrainerId={initialTrainerId}
      />
    </div>
  );
}
