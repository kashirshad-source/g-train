import Link from "next/link";
import { requireUserWithRole } from "@/lib/auth";
import { getMyLocations, getProfilesByIds } from "@/lib/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UpcomingSessions } from "./upcoming-sessions";

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

  const trainerIds = [...new Set((bookings ?? []).map((b) => b.trainer_id))];
  const trainers = await getProfilesByIds(supabase, trainerIds);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold">
            Welcome back{profile.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}
          </h1>
          <p className="text-muted-foreground">Here&apos;s what&apos;s coming up.</p>
        </div>
        <Button asChild>
          <Link href="/client/book">Book a session</Link>
        </Button>
      </div>

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
