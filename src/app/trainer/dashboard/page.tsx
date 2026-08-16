import Link from "next/link";
import { requireUserWithRole } from "@/lib/auth";
import { getMyLocations, getProfilesByIds, getRosteredClients } from "@/lib/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AddToCalendar } from "@/components/add-to-calendar";
import { DaySheet, type DaySheetAppointment } from "@/components/day-sheet";
import { buildLocationColorMap, DEFAULT_LOCATION_COLOR } from "@/lib/location-colors";
import { BookSessionButton } from "./book-session-button";
import { format, startOfWeek, endOfWeek, startOfDay, endOfDay, addDays } from "date-fns";

export default async function TrainerDashboardPage() {
  const { supabase, user, profile } = await requireUserWithRole("trainer");

  const today = new Date();
  const tomorrow = addDays(today, 1);
  const weekStart = startOfWeek(new Date());
  const weekEnd = endOfWeek(new Date());

  // These five don't depend on each other, so fetch them in parallel
  // instead of waiting on one Supabase round trip at a time.
  const [
    locations,
    { data: todayBookings },
    { data: tomorrowBookings },
    { data: allBookings },
    { count: sessionsThisWeek },
  ] = await Promise.all([
    getMyLocations(supabase, user.id, "trainer"),
    supabase
      .from("bookings")
      .select("*")
      .eq("trainer_id", user.id)
      .neq("status", "cancelled")
      .gte("start_time", startOfDay(today).toISOString())
      .lte("start_time", endOfDay(today).toISOString())
      .order("start_time", { ascending: true }),
    supabase
      .from("bookings")
      .select("*")
      .eq("trainer_id", user.id)
      .neq("status", "cancelled")
      .gte("start_time", startOfDay(tomorrow).toISOString())
      .lte("start_time", endOfDay(tomorrow).toISOString())
      .order("start_time", { ascending: true }),
    supabase.from("bookings").select("client_id").eq("trainer_id", user.id),
    supabase
      .from("bookings")
      .select("*", { count: "exact", head: true })
      .eq("trainer_id", user.id)
      .neq("status", "cancelled")
      .gte("start_time", weekStart.toISOString())
      .lte("start_time", weekEnd.toISOString()),
  ]);

  const clientIds = [
    ...new Set([...(todayBookings ?? []), ...(tomorrowBookings ?? [])].map((b) => b.client_id)),
  ];

  // These two depend on the results above (locations, booking client ids)
  // but not on each other, so they can still run together.
  const [clientsByLocationEntries, clientProfiles] = await Promise.all([
    Promise.all(
      locations.map(async (loc) => [loc.id, await getRosteredClients(supabase, user.id, loc.id)] as const)
    ),
    getProfilesByIds(supabase, clientIds),
  ]);
  const clientsByLocation = Object.fromEntries(clientsByLocationEntries);

  const clientById = new Map(clientProfiles.map((c) => [c.id, c]));
  const locationById = new Map(locations.map((l) => [l.id, l]));
  const locationColorMap = buildLocationColorMap(locations.map((l) => l.id));
  const totalClients = new Set((allBookings ?? []).map((b) => b.client_id)).size;

  const daySheetAppointments: DaySheetAppointment[] = (todayBookings ?? []).map((booking) => {
    const client = clientById.get(booking.client_id);
    const location = locationById.get(booking.location_id);
    return {
      id: booking.id,
      clientName: client?.full_name ?? client?.email ?? "Client",
      locationName: location?.name ?? "Location",
      startTime: booking.start_time,
      endTime: booking.end_time,
      color: locationColorMap.get(booking.location_id) ?? DEFAULT_LOCATION_COLOR,
    };
  });

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

      <div className="flex items-center justify-end">
        <Button asChild variant="outline" size="sm">
          <Link href="/trainer/schedule">Manage schedule</Link>
        </Button>
      </div>

      <DaySheet date={today} appointments={daySheetAppointments} />

      <Card>
        <CardHeader>
          <CardTitle>Tomorrow</CardTitle>
        </CardHeader>
        <CardContent>
          {!tomorrowBookings || tomorrowBookings.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing booked for tomorrow yet.</p>
          ) : (
            <ul className="flex flex-col divide-y">
              {tomorrowBookings.map((booking) => {
                const client = clientById.get(booking.client_id);
                const location = locationById.get(booking.location_id);
                const color = locationColorMap.get(booking.location_id) ?? DEFAULT_LOCATION_COLOR;
                return (
                  <li key={booking.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                    <div className="flex items-center gap-2">
                      <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: color.dot }} />
                      <div>
                        <div className="font-medium">{client?.full_name ?? client?.email ?? "Client"}</div>
                        <div className="text-sm text-muted-foreground">
                          {location?.name ?? "Location"} ·{" "}
                          {format(new Date(booking.start_time), "h:mm a")}
                        </div>
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
