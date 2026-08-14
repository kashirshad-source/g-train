"use client";

import { AcceptInviteForm } from "../../accept-invite-form";
import { acceptTrainerInvite } from "../../actions";

export function AcceptInviteWrapper({
  code,
  phone,
  name,
}: {
  code: string;
  phone: string;
  name: string;
}) {
  return (
    <AcceptInviteForm
      title="Join G-Train as a trainer"
      description="Confirm your name and set a password."
      phone={phone}
      initialName={name}
      onSubmit={(name, password) => acceptTrainerInvite(code, name, password)}
    />
  );
}
