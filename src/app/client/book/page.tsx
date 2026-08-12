import { requireUserWithRole } from "@/lib/auth";
import { getMyLocations, getLocationMembersByRole } from "@/lib/queries";
import { BookingFlow } from "./booking-flow";

export default async function ClientBookPage() {
  const { supabase, user } = await requireUserWithRole("client");
  const locations = await getMyLocations(supabase, user.id, "client");

  const trainersByLocation: Record<string, { id: string; full_name: string | null; email: string | null }[]> = {};
  for (const location of locations) {
    trainersByLocation[location.id] = await getLocationMembersByRole(supabase, location.id, "trainer");
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold">Book a session</h1>
        <p className="text-muted-foreground">Pick a location, trainer, and time that works.</p>
      </div>
      <BookingFlow locations={locations} trainersByLocation={trainersByLocation} />
    </div>
  );
}
