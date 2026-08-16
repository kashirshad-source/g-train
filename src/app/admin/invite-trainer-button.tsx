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
import { createTrainerAccount } from "./actions";
import { toast } from "sonner";

export function InviteTrainerButton() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [username, setUsername] = useState<string | null>(null);

  async function handleCreate() {
    if (!name.trim()) {
      toast.error("Enter their name");
      return;
    }
    setCreating(true);
    const result = await createTrainerAccount(name);
    setCreating(false);
    if (result.error || !result.username) {
      toast.error(result.error ?? "Couldn't create that account.");
      return;
    }
    setUsername(result.username);
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setName("");
      setUsername(null);
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
          <DialogDescription>Creates their account right away.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="admin-invite-name">Their name</Label>
          <Input
            id="admin-invite-name"
            placeholder="Jamie Rivera"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
            disabled={!!username}
          />
        </div>
        {username && (
          <div className="flex flex-col gap-1.5 rounded-md border border-border bg-secondary/40 px-3 py-2 text-sm">
            <div className="flex items-center justify-between">
              <span>
                Username: <span className="font-mono font-semibold">{username}</span>
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => {
                  navigator.clipboard.writeText(`Username: ${username}\nPassword: Granite`);
                  toast.success("Copied");
                }}
              >
                <Copy className="size-4" />
              </Button>
            </div>
            <span className="text-muted-foreground">
              Password: <span className="font-mono font-semibold text-foreground">Granite</span> — they&apos;ll
              be asked to change it on first sign-in.
            </span>
          </div>
        )}
        <DialogFooter>
          {username ? (
            <Button type="button" variant="cta" onClick={() => handleOpenChange(false)}>
              Done
            </Button>
          ) : (
            <Button type="button" variant="cta" disabled={creating} onClick={handleCreate}>
              {creating ? "Creating…" : "Create trainer"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
