"use client";

import { useState } from "react";
import { Dumbbell, User } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AvatarPicker } from "@/components/avatar-picker";
import { completeOnboarding } from "./actions";

const ERROR_MESSAGES: Record<string, string> = {
  missing_fields: "Please pick a role and enter a valid phone number.",
  invalid_code: "That activation code isn't valid. Check with whoever invited you.",
  profile_update_failed: "Couldn't update your profile. Try again.",
};

type Role = "trainer" | "client";

export function OnboardingFlow({ error, userId }: { error?: string; userId: string }) {
  const [role, setRole] = useState<Role | null>(null);
  const [avatarUrl, setAvatarUrl] = useState("");
  const [phone, setPhone] = useState("");
  const [activationCode, setActivationCode] = useState("");

  return (
    <div className="w-full max-w-md">
      <h1 className="font-heading mb-1 text-2xl font-semibold">Welcome</h1>
      <p className="mb-6 text-muted-foreground">Tell us how you&apos;ll use G-Train.</p>

      {error && (
        <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {ERROR_MESSAGES[error] ?? "Something went wrong. Please try again."}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Get started</CardTitle>
          <CardDescription>Pick a role, add your phone, and if you&apos;d like, an avatar.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <RoleCard
              icon={<Dumbbell className="size-5" />}
              title="I'm a trainer"
              description="Manage clients, schedule sessions, and run your business."
              selected={role === "trainer"}
              onClick={() => setRole("trainer")}
            />
            <RoleCard
              icon={<User className="size-5" />}
              title="I'm a client"
              description="Book sessions and train with your coach."
              selected={role === "client"}
              onClick={() => setRole("client")}
            />
          </div>

          <AvatarPicker userId={userId} value={avatarUrl} onChange={setAvatarUrl} />

          <form action={completeOnboarding} className="flex flex-col gap-4">
            <input type="hidden" name="role" value={role ?? ""} />
            {avatarUrl && <input type="hidden" name="avatar_url" value={avatarUrl} />}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="phone">Phone number</Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(555) 123-4567"
                required
              />
              <p className="text-xs text-muted-foreground">Matches your text invite.</p>
            </div>
            {role === "trainer" && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="activation_code">Trainer activation code</Label>
                <Input
                  id="activation_code"
                  name="activation_code"
                  value={activationCode}
                  onChange={(e) => setActivationCode(e.target.value)}
                  placeholder="e.g. a1b2c3d4"
                  required
                />
                <p className="text-xs text-muted-foreground">Sent to you when invited.</p>
              </div>
            )}
            <Button
              type="submit"
              variant="cta"
              className="w-full"
              disabled={
                !role ||
                phone.replace(/\D/g, "").length !== 10 ||
                (role === "trainer" && !activationCode.trim())
              }
            >
              Finish
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function RoleCard({
  icon,
  title,
  description,
  selected,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-col items-start gap-2 rounded-lg border p-4 text-left transition-colors",
        selected ? "border-primary bg-accent" : "border-border bg-card hover:border-primary/60 hover:bg-accent"
      )}
    >
      <div className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary">
        {icon}
      </div>
      <div className="font-medium">{title}</div>
      <p className="text-sm text-muted-foreground">{description}</p>
    </button>
  );
}
