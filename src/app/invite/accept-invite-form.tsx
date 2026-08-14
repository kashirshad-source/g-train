"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { formatPhone } from "@/lib/phone";
import { toast } from "sonner";

export function AcceptInviteForm({
  title,
  description,
  phone,
  initialName,
  onSubmit,
}: {
  title: string;
  description: string;
  phone: string;
  initialName?: string;
  onSubmit: (name: string, password: string) => Promise<{ error?: string } | undefined>;
}) {
  const [name, setName] = useState(initialName ?? "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Enter your name");
      return;
    }
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords don't match");
      return;
    }
    startTransition(() => {
      onSubmit(name, password).then((result) => {
        if (result?.error) toast.error(result.error);
      });
    });
  }

  return (
    <div className="w-full max-w-sm">
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>Phone number</Label>
              <div className="flex h-9 items-center rounded-md border border-input bg-muted px-3 text-sm text-muted-foreground">
                {formatPhone(phone)}
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="invite-name">Your name</Label>
              <Input
                id="invite-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jamie Rivera"
                autoFocus
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="invite-password">Password</Label>
              <Input
                id="invite-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="invite-confirm-password">Confirm password</Label>
              <Input
                id="invite-confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Type it again"
              />
            </div>
            <Button type="submit" variant="cta" disabled={isPending}>
              {isPending ? "Setting up your account…" : "Join"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
