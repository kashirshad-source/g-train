"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { AvatarPicker } from "@/components/avatar-picker";
import { updateProfile } from "./actions";

export function SettingsForm({
  userId,
  fullName,
  phone,
  avatarUrl,
}: {
  userId: string;
  fullName: string;
  phone: string;
  avatarUrl: string;
}) {
  const [avatar, setAvatar] = useState(avatarUrl);

  return (
    <form action={updateProfile} className="flex flex-col gap-5 sm:max-w-sm">
      <input type="hidden" name="avatar_url" value={avatar} />
      <AvatarPicker userId={userId} value={avatar} onChange={setAvatar} />

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="full_name">Display name</Label>
        <Input id="full_name" name="full_name" defaultValue={fullName} placeholder="Your name" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="phone">Phone number</Label>
        <Input
          id="phone"
          name="phone"
          type="tel"
          defaultValue={phone}
          placeholder="(555) 123-4567"
        />
        <p className="text-xs text-muted-foreground">
          Used to match you to a trainer's text invite.
        </p>
      </div>
      <Button type="submit" variant="cta" className="self-start">
        Save
      </Button>
    </form>
  );
}
