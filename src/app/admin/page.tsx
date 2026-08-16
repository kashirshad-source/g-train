import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { InviteTrainerButton } from "./invite-trainer-button";

export default async function AdminPage() {
  await requireAdmin();
  const admin = createAdminClient();

  const [{ data: profiles }, { data: locations }, { data: members }, { count: bookingCount }] =
    await Promise.all([
      admin
        .from("profiles")
        .select("id, full_name, email, phone, username, default_role, avatar_url, created_at")
        .order("created_at", { ascending: false }),
      admin.from("locations").select("id, name, address, is_base, created_at").order("name"),
      admin.from("location_members").select("location_id, user_id, role, status"),
      admin.from("bookings").select("id", { count: "exact", head: true }),
    ]);

  const allProfiles = profiles ?? [];
  const allLocations = locations ?? [];
  const allMembers = members ?? [];

  const trainers = allProfiles.filter((p) => p.default_role === "trainer");
  const clients = allProfiles.filter((p) => p.default_role === "client");

  const locationCounts = new Map<string, { trainers: number; clients: number }>();
  const trainerLocationCounts = new Map<string, number>();
  for (const m of allMembers) {
    if (m.status !== "active") continue;
    const counts = locationCounts.get(m.location_id) ?? { trainers: 0, clients: 0 };
    if (m.role === "trainer") {
      counts.trainers += 1;
      trainerLocationCounts.set(m.user_id, (trainerLocationCounts.get(m.user_id) ?? 0) + 1);
    } else {
      counts.clients += 1;
    }
    locationCounts.set(m.location_id, counts);
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-heading text-2xl font-semibold">Admin</h1>
        <p className="text-muted-foreground">Everything on the platform, in one place.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <StatCard label="Trainers" value={trainers.length} />
        <StatCard label="Clients" value={clients.length} />
        <StatCard label="Locations" value={allLocations.length} />
        <StatCard label="Bookings" value={bookingCount ?? 0} />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Trainers</CardTitle>
            <CardDescription>Every trainer on the platform.</CardDescription>
          </div>
          <InviteTrainerButton />
        </CardHeader>
        <CardContent>
          {trainers.length === 0 ? (
            <p className="text-sm text-muted-foreground">No trainers yet.</p>
          ) : (
            <ul className="flex flex-col divide-y">
              {trainers.map((t) => (
                <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <div>
                    <div className="text-sm font-medium">{t.full_name ?? t.username ?? t.email}</div>
                    <div className="text-xs text-muted-foreground">
                      {t.username ? `Username: ${t.username}` : t.email}
                      {t.phone ? ` · ${t.phone}` : ""}
                    </div>
                  </div>
                  <Badge variant="secondary">
                    {trainerLocationCounts.get(t.id) ?? 0} location
                    {(trainerLocationCounts.get(t.id) ?? 0) === 1 ? "" : "s"}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Locations</CardTitle>
          <CardDescription>Every location, and who&apos;s at it.</CardDescription>
        </CardHeader>
        <CardContent>
          {allLocations.length === 0 ? (
            <p className="text-sm text-muted-foreground">No locations yet.</p>
          ) : (
            <ul className="flex flex-col divide-y">
              {allLocations.map((loc) => {
                const counts = locationCounts.get(loc.id) ?? { trainers: 0, clients: 0 };
                return (
                  <li key={loc.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                    <div>
                      <div className="text-sm font-medium">
                        {loc.name} {loc.is_base && <Badge variant="secondary">Base</Badge>}
                      </div>
                      {loc.address && (
                        <div className="text-xs text-muted-foreground">{loc.address}</div>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {counts.trainers} trainer{counts.trainers === 1 ? "" : "s"} ·{" "}
                      {counts.clients} client{counts.clients === 1 ? "" : "s"}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Clients</CardTitle>
          <CardDescription>Every client on the platform.</CardDescription>
        </CardHeader>
        <CardContent>
          {clients.length === 0 ? (
            <p className="text-sm text-muted-foreground">No clients yet.</p>
          ) : (
            <ul className="flex flex-col divide-y">
              {clients.map((c) => (
                <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <div className="text-sm font-medium">{c.full_name ?? c.email}</div>
                  <div className="text-xs text-muted-foreground">
                    {c.email} {c.phone ? `· ${c.phone}` : ""}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardContent className="py-6">
        <div className="text-3xl font-semibold text-primary">{value}</div>
        <div className="text-sm text-muted-foreground">{label}</div>
      </CardContent>
    </Card>
  );
}
