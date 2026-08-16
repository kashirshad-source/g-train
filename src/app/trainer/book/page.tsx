import Link from "next/link";
import { requireUserWithRole } from "@/lib/auth";
import { getMyLocations, getRosteredClients } from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { TrainerBookingForm } from "./booking-form";

export default async function TrainerBookPage({
  searchParams,
}: {
  searchParams: Promise<{ location?: string }>;
}) {
  const { location: locationParam } = await searchParams;
  const { supabase, user } = await requireUserWithRole("trainer");
  const locations = await getMyLocations(supabase, user.id, "trainer");
  const locationIds = locations.map((l) => l.id);

  const [clientsByLocationEntries, { data: availability }] = await Promise.all([
    Promise.all(
      locations.map(async (loc) => [loc.id, await getRosteredClients(supabase, user.id, loc.id)] as const)
    ),
    locationIds.length > 0
      ? supabase
          .from("availability")
          .select("location_id, date, start_time, end_time")
          .eq("trainer_id", user.id)
          .in("location_id", locationIds)
      : Promise.resolve({ data: [] }),
  ]);
  const clientsByLocation = Object.fromEntries(clientsByLocationEntries);

  // Only honor the shortcut's query param if it actually matches a
  // location this trainer manages — never trust it blindly.
  const initialLocationId = locations.some((l) => l.id === locationParam) ? locationParam : undefined;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold">Book a session</h1>
        <p className="text-muted-foreground">Doesn&apos;t have to fit your set hours.</p>
      </div>

      {locations.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Set up a location first from the{" "}
          <Button asChild variant="link" className="h-auto p-0">
            <Link href="/trainer/locations">Locations page</Link>
          </Button>{" "}
          before booking a session.
        </p>
      ) : (
        <TrainerBookingForm
          locations={locations}
          clientsByLocation={clientsByLocation}
          availability={availability ?? []}
          initialLocationId={initialLocationId}
        />
      )}
    </div>
  );
}
