import { requireProfile } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatPhone } from "@/lib/phone";
import { SettingsForm } from "./settings-form";

export default async function SettingsPage() {
  const { user, profile } = await requireProfile();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold">Settings</h1>
        <p className="text-muted-foreground">Manage your profile.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <div>
            <div className="font-medium">
              {profile.full_name ?? profile.email ?? profile.phone}
            </div>
            <div className="text-sm text-muted-foreground">
              {profile.email ?? profile.phone}
            </div>
            {profile.default_role && (
              <Badge variant="secondary" className="mt-1 capitalize">
                {profile.default_role}
              </Badge>
            )}
          </div>

          <SettingsForm
            userId={user.id}
            fullName={profile.full_name ?? ""}
            phone={profile.phone ? formatPhone(profile.phone) : ""}
            avatarUrl={profile.avatar_url ?? ""}
          />
        </CardContent>
      </Card>
    </div>
  );
}
