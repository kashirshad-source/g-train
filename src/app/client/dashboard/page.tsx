import Link from "next/link";
import { requireUserWithRole } from "@/lib/auth";
import { getMyLocations, getProfilesByIds } from "@/lib/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UpcomingSessions } from "./upcoming-sessions";
import { OpenSlots } from "./open-slots";

export default async function ClientDashboardPage() {
  const { supabase, user, profile } = await requireUserWithRole("client");

  const locations = await getMyLocations(supabase, user.id, "client");

  const nowISO = new Date().toISOString();
  const { data: bookings } = await supabase
    .from("bookings")
    .select("*")
    .eq("client_id", user.id)
    .neq("status", "cancelled")
    .gte("start_time", nowISO)
    .order("start_time", { ascending: true })
    .limit(10);

  // "Usual trainer": whoever the most recent booking was with, so the
  // primary CTA can skip straight to picking a time instead of re-picking
  // a location and trainer the client has already been training with.
  // Falls back to their only trainer relationship if they haven't booked yet.
  const { data: recentBooking } = await supabase
    .from("bookings")
    .select("trainer_id, location_id")
    .eq("client_id", user.id)
    .neq("status", "cancelled")
    .order("start_time", { ascending: false })
    .limit(1)
    .maybeSingle();

  let usualTrainerId = recentBooking?.trainer_id ?? null;
  let usualLocationId = recentBooking?.location_id ?? null;

  if (!usualTrainerId) {
    const { data: rosterRows } = await supabase
      .from("client_rosters")
      .select("trainer_id, location_id")
      .eq("client_id", user.id);
    if (rosterRows && rosterRows.length === 1) {
      usualTrainerId = rosterRows[0].trainer_id;
      usualLocationId = rosterRows[0].location_id;
    }
  }

  const trainerIds = [
    ...new Set([...(bookings ?? []).map((b) => b.trainer_id), ...(usualTrainerId ? [usualTrainerId] : [])]),
  ];
  const trainers = await getProfilesByIds(supabase, trainerIds);
  const usualTrainer = usualTrainerId ? trainers.find((t) => t.id === usualTrainerId) : undefined;

  const locationIds = locations.map((l) => l.id);
  const { data: openOffers } =
    locationIds.length > 0
      ? await supabase
          .from("slot_offers")
          .select("id, location_id, start_time, end_time")
          .in("location_id", locationIds)
          .eq("status", "open")
          .order("start_time", { ascending: true })
      : { data: [] };

  const offerIds = (openOffers ?? []).map((o) => o.id);
  const { data: myRequests } =
    offerIds.length > 0
      ? await supabase
          .from("slot_offer_requests")
          .select("slot_offer_id")
          .eq("client_id", user.id)
          .in("slot_offer_id", offerIds)
      : { data: [] };
  const requestedOfferIds = (myRequests ?? []).map((r) => r.slot_offer_id);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold">
            Welcome back{profile.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}
          </h1>
          <p className="text-muted-foreground">Here&apos;s what&apos;s coming up.</p>
        </div>
        {usualTrainer && usualLocationId ? (
          <div className="flex flex-col items-end gap-1">
            <Button asChild>
              <Link href={`/client/book?location=${usualLocationId}&trainer=${usualTrainerId}`}>
                Book with {usualTrainer.full_name?.split(" ")[0] ?? usualTrainer.email}
              </Link>
            </Button>
            <Link
              href="/client/book"
              className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
            >
              or choose someone else
            </Link>
          </div>
        ) : (
          <Button asChild>
            <Link href="/client/book">Book a session</Link>
          </Button>
        )}
      </div>

      <OpenSlots offers={openOffers ?? []} locations={locations} requestedIds={requestedOfferIds} />

      <Card>
        <CardHeader>
          <CardTitle>Upcoming sessions</CardTitle>
        </CardHeader>
        <CardContent>
          <UpcomingSessions bookings={bookings ?? []} trainers={trainers} locations={locations} />
        </CardContent>
      </Card>

      {locations.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-start gap-3 py-6">
            <p className="text-sm text-muted-foreground">
              You haven&apos;t joined a training location yet.
            </p>
            <Button asChild size="sm">
              <Link href="/client/locations">Join a location</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
