"use client";

import { AcceptInviteForm } from "../../accept-invite-form";
import { acceptLocationInvite } from "../../actions";

export function AcceptInviteWrapper({
  inviteId,
  name,
  phone,
  role,
  locationName,
}: {
  inviteId: string;
  name: string | null;
  phone: string;
  role: "trainer" | "client";
  locationName: string;
}) {
  return (
    <AcceptInviteForm
      title={role === "trainer" ? `Join ${locationName} as a trainer` : `Join ${locationName}`}
      description="Add your name and a password to finish."
      phone={phone}
      initialName={name ?? ""}
      onSubmit={(enteredName, password) => acceptLocationInvite(inviteId, enteredName, password)}
    />
  );
}
