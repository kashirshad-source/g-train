import { requireUserWithRole } from "@/lib/auth";
import { getMyLocations, getRosteredClients } from "@/lib/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProfileAvatar } from "@/components/profile-avatar";

export default async function TrainerClientsPage() {
  const { supabase, user } = await requireUserWithRole("trainer");
  const locations = await getMyLocations(supabase, user.id, "trainer");

  const clientsByLocation = await Promise.all(
    locations.map(async (location) => ({
      location,
      clients: await getRosteredClients(supabase, user.id, location.id),
    }))
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold">Clients</h1>
        <p className="text-muted-foreground">Everyone you've booked.</p>
      </div>

      {locations.length === 0 && (
        <p className="text-sm text-muted-foreground">
          You don&apos;t manage any locations yet.
        </p>
      )}

      {clientsByLocation.map(({ location, clients }) => (
        <Card key={location.id}>
          <CardHeader>
            <CardTitle>{location.name}</CardTitle>
          </CardHeader>
          <CardContent>
            {clients.length === 0 ? (
              <p className="text-sm text-muted-foreground">No clients here yet.</p>
            ) : (
              <ul className="flex flex-col divide-y">
                {clients.map((client) => (
                  <li key={client.id} className="flex items-center gap-3 py-3">
                    <ProfileAvatar
                      avatarUrl={client.avatar_url}
                      fallback={(client.full_name ?? client.email ?? "?")[0]?.toUpperCase() ?? "?"}
                      className="size-9"
                    />
                    <div>
                      <div className="font-medium">{client.full_name ?? client.email}</div>
                      <div className="text-sm text-muted-foreground">{client.email}</div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
