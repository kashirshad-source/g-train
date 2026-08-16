import { requireUserWithRole } from "@/lib/auth";
import { getMyLocations, getLocationMembersByRole, getRosteredClients } from "@/lib/queries";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ProfileAvatar } from "@/components/profile-avatar";
import { DeleteLocationButton } from "./delete-location-button";
import { InviteMemberButton } from "./invite-member-button";
import { CreateLocationForm } from "./create-location-form";
import { removeMember, removeRosterClient } from "./actions";

export default async function TrainerLocationsPage() {
  const { supabase, user } = await requireUserWithRole("trainer");
  const locations = await getMyLocations(supabase, user.id, "trainer");

  const rosters = await Promise.all(
    locations.map(async (location) => {
      const [trainers, clients] = await Promise.all([
        getLocationMembersByRole(supabase, location.id, "trainer"),
        getRosteredClients(supabase, user.id, location.id),
      ]);
      return { location, trainers, clients };
    })
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold">Locations</h1>
        <p className="text-muted-foreground">Where you train, and who's there.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create a location</CardTitle>
          <CardDescription>Invite people by text once it&apos;s created.</CardDescription>
        </CardHeader>
        <CardContent>
          <CreateLocationForm />
        </CardContent>
      </Card>

      {rosters.map(({ location, trainers, clients }) => (
        <Card key={location.id}>
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle>{location.name}</CardTitle>
              {location.address && <CardDescription>{location.address}</CardDescription>}
            </div>
            <div className="flex items-center gap-2">
              {!location.is_base && (
                <DeleteLocationButton locationId={location.id} locationName={location.name} />
              )}
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            <div>
              <h3 className="mb-2 text-sm font-medium text-muted-foreground">Trainers</h3>
              <MemberList
                members={trainers}
                locationId={location.id}
                currentUserId={user.id}
                removeAction={removeMember}
              />
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between gap-3">
                <h3 className="text-sm font-medium text-muted-foreground">Your clients here</h3>
                <InviteMemberButton
                  locationId={location.id}
                  locationName={location.name}
                  role="client"
                />
              </div>
              <MemberList
                members={clients}
                locationId={location.id}
                currentUserId={user.id}
                removeAction={removeRosterClient}
              />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function MemberList({
  members,
  locationId,
  currentUserId,
  removeAction,
}: {
  members: { id: string; full_name: string | null; email: string | null; avatar_url: string | null }[];
  locationId: string;
  currentUserId: string;
  removeAction: (locationId: string, memberId: string) => Promise<void>;
}) {
  if (members.length === 0) {
    return <p className="text-sm text-muted-foreground">None yet.</p>;
  }

  return (
    <ul className="flex flex-col divide-y">
      {members.map((member) => (
        <li key={member.id} className="flex items-center justify-between py-2">
          <div className="flex items-center gap-3">
            <ProfileAvatar
              avatarUrl={member.avatar_url}
              fallback={(member.full_name ?? member.email ?? "?")[0]?.toUpperCase() ?? "?"}
              className="size-8"
            />
            <div>
              <div className="text-sm font-medium">{member.full_name ?? member.email}</div>
              <div className="text-xs text-muted-foreground">{member.email}</div>
            </div>
          </div>
          {member.id !== currentUserId && (
            <form action={removeAction.bind(null, locationId, member.id)}>
              <Button type="submit" variant="ghost" size="sm">
                Remove
              </Button>
            </form>
          )}
        </li>
      ))}
    </ul>
  );
}
