"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus } from "lucide-react";
import { createClientInvite, createTrainerInvite } from "./actions";
import { toast } from "sonner";

export function InviteMemberButton({
  locationId,
  locationName,
  role,
}: {
  locationId: string;
  locationName: string;
  role: "trainer" | "client";
}) {
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState("");
  const [sending, setSending] = useState(false);

  async function handleInvite() {
    if (!phone.trim()) {
      toast.error("Enter their phone number");
      return;
    }
    setSending(true);
    const invite = role === "trainer" ? createTrainerInvite : createClientInvite;
    const result = await invite(locationId, phone);
    setSending(false);
    if (result.error || !result.id) {
      toast.error(result.error ?? "Couldn't create the invite. Try again.");
      return;
    }

    const digits = phone.replace(/\D/g, "");
    const link = `${window.location.origin}/invite/l/${result.id}`;
    const message = `You're invited to train at ${locationName} on G-Train! Tap to join: ${link}`;
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    window.location.href = `sms:${digits}${isIOS ? "&" : "?"}body=${encodeURIComponent(message)}`;

    setOpen(false);
    setPhone("");
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          <UserPlus className="mr-1.5 size-4" />
          Invite a {role}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Invite a {role} to {locationName}
          </DialogTitle>
          <DialogDescription>
            We&apos;ll open a text with a link — they just add their name and a password and
            they&apos;re in, no separate sign-up needed.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`invite-phone-${role}`}>Their phone number</Label>
          <Input
            id={`invite-phone-${role}`}
            type="tel"
            placeholder="(555) 123-4567"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            autoFocus
          />
        </div>
        <DialogFooter>
          <Button type="button" variant="cta" disabled={sending} onClick={handleInvite}>
            {sending ? "Sending…" : "Invite"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
