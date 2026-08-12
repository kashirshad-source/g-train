import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { AcceptInviteWrapper } from "./accept-invite-wrapper";

export default async function TrainerInvitePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/");

  const admin = createAdminClient();
  const { data: invite } = await admin
    .from("admin_trainer_invites")
    .select("phone, status")
    .eq("code", code)
    .maybeSingle();

  if (!invite || invite.status !== "pending" || !invite.phone) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6 py-16 text-center">
        <p className="text-muted-foreground">
          This invite link isn&apos;t valid anymore. Ask your admin to send a new one.
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-16">
      <AcceptInviteWrapper code={code} phone={invite.phone} />
    </div>
  );
}
