"use client";

import { AcceptInviteForm } from "../../accept-invite-form";
import { acceptTrainerInvite } from "../../actions";

export function AcceptInviteWrapper({ code, phone }: { code: string; phone: string }) {
  return (
    <AcceptInviteForm
      title="Join G-Train as a trainer"
      description="You've been invited to join as a trainer. Add your name and a password to finish."
      phone={phone}
      onSubmit={(name, password) => acceptTrainerInvite(code, name, password)}
    />
  );
}
