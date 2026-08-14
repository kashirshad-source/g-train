"use client";

import { AcceptInviteForm } from "../../accept-invite-form";
import { acceptLocationInvite } from "../../actions";

export function AcceptInviteWrapper({
  inviteId,
  phone,
  role,
  locationName,
}: {
  inviteId: string;
  phone: string;
  role: "trainer" | "client";
  locationName: string;
}) {
  return (
    <AcceptInviteForm
      title={role === "trainer" ? `Join ${locationName} as a trainer` : `Join ${locationName}`}
      description="Add your name and a password to finish."
      phone={phone}
      onSubmit={(name, password) => acceptLocationInvite(inviteId, name, password)}
    />
  );
}
