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
import { UserPlus, Copy } from "lucide-react";
import { generateTrainerInvite } from "./actions";
import { toast } from "sonner";

export function InviteTrainerButton() {
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState("");
  const [sending, setSending] = useState(false);
  const [code, setCode] = useState<string | null>(null);

  async function handleGenerate() {
    if (!phone.trim()) {
      toast.error("Enter their phone number");
      return;
    }
    setSending(true);
    const result = await generateTrainerInvite(phone);
    setSending(false);
    if (result.error || !result.code) {
      toast.error(result.error ?? "Couldn't create the invite.");
      return;
    }

    setCode(result.code);
    const digits = phone.replace(/\D/g, "");
    const link = `${window.location.origin}/invite/t/${result.code}`;
    const message = `You're invited to join G-Train as a trainer! Tap to join: ${link}`;
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    window.location.href = `sms:${digits}${isIOS ? "&" : "?"}body=${encodeURIComponent(message)}`;
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setPhone("");
      setCode(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button type="button" variant="cta" size="sm">
          <UserPlus className="mr-1.5 size-4" />
          Invite a trainer
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite a trainer</DialogTitle>
          <DialogDescription>
            We&apos;ll open a text with a link — they just add their name and a password and
            they&apos;re a trainer, no separate sign-up needed.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="admin-invite-phone">Their phone number</Label>
          <Input
            id="admin-invite-phone"
            type="tel"
            placeholder="(555) 123-4567"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            autoFocus
          />
        </div>
        {code && (
          <div className="flex items-center justify-between rounded-md border border-border bg-secondary/40 px-3 py-2 text-sm">
            <span>
              Activation code: <span className="font-mono font-semibold tabular-nums">{code}</span>
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => {
                navigator.clipboard.writeText(code);
                toast.success("Code copied");
              }}
            >
              <Copy className="size-4" />
            </Button>
          </div>
        )}
        <DialogFooter>
          <Button type="button" variant="cta" disabled={sending} onClick={handleGenerate}>
            {sending ? "Generating…" : "Generate & text"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
