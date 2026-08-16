import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { AcceptInviteWrapper } from "./accept-invite-wrapper";

export default async function LocationInvitePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/");

  const admin = createAdminClient();
  const { data: invite } = await admin
    .from("location_invites")
    .select("name, phone, role, status, locations(name)")
    .eq("id", id)
    .maybeSingle();

  if (!invite || invite.status !== "pending") {
    return (
      <div className="flex min-h-screen items-center justify-center px-6 py-16 text-center">
        <p className="text-muted-foreground">
          This invite link isn&apos;t valid anymore. Ask whoever invited you to send a new one.
        </p>
      </div>
    );
  }

  const locationName = (invite as unknown as { locations: { name: string } | null }).locations
    ?.name;

  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-16">
      <AcceptInviteWrapper
        inviteId={id}
        name={invite.name}
        phone={invite.phone}
        role={invite.role as "trainer" | "client"}
        locationName={locationName ?? "your trainer's location"}
      />
    </div>
  );
}
