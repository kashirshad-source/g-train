import Link from "next/link";
import { requireUserWithRole } from "@/lib/auth";
import { getMyLocations, getProfilesByIds, getRosteredClients } from "@/lib/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AddToCalendar } from "@/components/add-to-calendar";
import { BookSessionButton } from "./book-session-button";
import { format, startOfWeek, endOfWeek } from "date-fns";

export default async function TrainerDashboardPage() {
  const { supabase, user, profile } = await requireUserWithRole("trainer");

  const locations = await getMyLocations(supabase, user.id, "trainer");

  const clientsByLocationEntries = await Promise.all(
    locations.map(async (loc) => [loc.id, await getRosteredClients(supabase, user.id, loc.id)] as const)
  );
  const clientsByLocation = Object.fromEntries(clientsByLocationEntries);

  const nowISO = new Date().toISOString();
  const { data: upcomingBookings } = await supabase
    .from("bookings")
    .select("*")
    .eq("trainer_id", user.id)
    .eq("status", "confirmed")
    .gte("start_time", nowISO)
    .order("start_time", { ascending: true })
    .limit(10);

  const clientIds = [...new Set((upcomingBookings ?? []).map((b) => b.client_id))];
  const clientProfiles = await getProfilesByIds(supabase, clientIds);
  const clientById = new Map(clientProfiles.map((c) => [c.id, c]));
  const locationById = new Map(locations.map((l) => [l.id, l]));

  const { data: allBookings } = await supabase
    .from("bookings")
    .select("client_id")
    .eq("trainer_id", user.id);
  const totalClients = new Set((allBookings ?? []).map((b) => b.client_id)).size;

  const weekStart = startOfWeek(new Date());
  const weekEnd = endOfWeek(new Date());
  const { count: sessionsThisWeek } = await supabase
    .from("bookings")
    .select("*", { count: "exact", head: true })
    .eq("trainer_id", user.id)
    .neq("status", "cancelled")
    .gte("start_time", weekStart.toISOString())
    .lte("start_time", weekEnd.toISOString());

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-semibold">
            Welcome back{profile.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}
          </h1>
          <p className="text-muted-foreground">Here&apos;s what&apos;s coming up.</p>
        </div>
        {locations.length > 0 && (
          <BookSessionButton locations={locations} clientsByLocation={clientsByLocation} />
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Locations" value={locations.length} tone="sky" />
        <StatCard label="Active clients" value={totalClients} tone="azure" />
        <StatCard label="Sessions this week" value={sessionsThisWeek ?? 0} tone="graphite" />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Upcoming sessions</CardTitle>
          <Button asChild variant="outline" size="sm">
            <Link href="/trainer/schedule">Manage schedule</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {!upcomingBookings || upcomingBookings.length === 0 ? (
            <p className="text-sm text-muted-foreground">No upcoming sessions booked yet.</p>
          ) : (
            <ul className="flex flex-col divide-y">
              {upcomingBookings.map((booking) => {
                const client = clientById.get(booking.client_id);
                const location = locationById.get(booking.location_id);
                return (
                  <li key={booking.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                    <div>
                      <div className="font-medium">{client?.full_name ?? client?.email ?? "Client"}</div>
                      <div className="text-sm text-muted-foreground">
                        {location?.name ?? "Location"} ·{" "}
                        {format(new Date(booking.start_time), "EEE MMM d, h:mm a")}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{booking.status}</Badge>
                      <AddToCalendar
                        title={`Training session with ${client?.full_name ?? client?.email ?? "client"}`}
                        location={location?.name}
                        start={booking.start_time}
                        end={booking.end_time}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      {locations.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-start gap-3 py-6">
            <p className="text-sm text-muted-foreground">
              You don&apos;t manage any locations yet.
            </p>
            <Button asChild size="sm">
              <Link href="/trainer/locations">Set up a location</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Soft tints for the stat tiles — two stops of the palette's light-blue
// accent, plus a neutral tint of the anchor black. Gold stays reserved for
// the one CTA on the page (Book a session), per the brand palette.
const STAT_TONES = {
  sky: "#D7F2FD",
  azure: "#BAE6FD",
  graphite: "#E7EAEE",
} as const;

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: keyof typeof STAT_TONES;
}) {
  return (
    <Card style={{ backgroundColor: STAT_TONES[tone] }}>
      <CardContent className="py-6">
        <div className="text-3xl font-semibold text-primary">{value}</div>
        <div className="text-sm text-muted-foreground">{label}</div>
      </CardContent>
    </Card>
  );
}
