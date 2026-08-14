import { requireUserWithRole } from "@/lib/auth";
import { getMyLocations, getLocationMembersByRole } from "@/lib/queries";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { leaveLocation } from "./actions";

export default async function ClientLocationsPage() {
  const { supabase, user } = await requireUserWithRole("client");
  const locations = await getMyLocations(supabase, user.id, "client");

  const rosters = await Promise.all(
    locations.map(async (location) => ({
      location,
      trainers: await getLocationMembersByRole(supabase, location.id, "trainer"),
    }))
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold">Locations</h1>
        <p className="text-muted-foreground">Where you train.</p>
      </div>

      {rosters.length === 0 && (
        <p className="text-sm text-muted-foreground">
          You&apos;re not part of any location yet — ask a trainer to text you an invite.
        </p>
      )}

      {rosters.map(({ location, trainers }) => (
        <Card key={location.id}>
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle>{location.name}</CardTitle>
              {location.address && <CardDescription>{location.address}</CardDescription>}
            </div>
            <form action={leaveLocation.bind(null, location.id)}>
              <Button type="submit" variant="ghost" size="sm">
                Leave
              </Button>
            </form>
          </CardHeader>
          <CardContent>
            <h3 className="mb-2 text-sm font-medium text-muted-foreground">Trainers here</h3>
            {trainers.length === 0 ? (
              <p className="text-sm text-muted-foreground">No trainers yet.</p>
            ) : (
              <ul className="flex flex-col divide-y">
                {trainers.map((trainer) => (
                  <li key={trainer.id} className="py-2">
                    <span className="text-sm">{trainer.full_name ?? trainer.email}</span>
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
