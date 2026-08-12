"use client";

import { useId, useState } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ProfileAvatar } from "@/components/profile-avatar";
import { createClient } from "@/lib/supabase/client";

// Diverse face avatars: genders, skin tones, and hairstyles, so people can
// pick something that actually looks like them without needing a photo.
const EMOJIS = [
  "👨🏻", "👩🏻", "👨🏻‍🦰", "👩🏻‍🦱", "👨🏻‍🦳", "👩🏻‍🦲", "🧑🏻", "🧑🏻‍🦱",
  "👨🏽", "👩🏽", "👨🏽‍🦰", "👩🏽‍🦱", "👨🏽‍🦳", "👩🏽‍🦲", "🧑🏽", "🧑🏽‍🦱",
  "👨🏿", "👩🏿", "👨🏿‍🦰", "👩🏿‍🦱", "👨🏿‍🦳", "👩🏿‍🦲", "🧑🏿", "🧑🏿‍🦱",
];

export function AvatarPicker({
  userId,
  value,
  onChange,
}: {
  userId: string;
  value: string;
  onChange: (url: string) => void;
}) {
  const fileId = useId();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setUploading(true);
    setError("");
    const supabase = createClient();
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${userId}/${crypto.randomUUID()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true });

    if (uploadError) {
      setError("Couldn't upload that photo. Try again.");
      setUploading(false);
      return;
    }

    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    onChange(data.publicUrl);
    setUploading(false);
    setPickerOpen(false);
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Label>Profile photo</Label>
      <div className="flex items-center gap-3">
        <ProfileAvatar avatarUrl={value} fallback="" className="size-14 text-2xl" />
        <div className="flex flex-col gap-1.5">
          <div className="flex flex-wrap gap-2">
            <Label
              htmlFor={fileId}
              className="inline-flex w-fit cursor-pointer items-center rounded-md border border-border bg-secondary px-3 py-1.5 text-sm font-medium text-secondary-foreground transition-colors hover:bg-accent"
            >
              {uploading ? "Uploading..." : "Upload a photo"}
            </Label>
            <input
              id={fileId}
              type="file"
              accept="image/*"
              onChange={handleFile}
              disabled={uploading}
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPickerOpen((v) => !v)}
            >
              Pick an avatar
            </Button>
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
      </div>

      {pickerOpen && (
        <div className="mt-1 grid grid-cols-8 gap-1 rounded-md border border-border bg-secondary/40 p-2">
          {EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => {
                onChange(`emoji:${emoji}`);
                setPickerOpen(false);
              }}
              className="flex items-center justify-center rounded-md py-1.5 text-xl transition-colors hover:bg-accent"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Optional — upload a photo or pick an avatar. You can change this later in Settings.
      </p>
    </div>
  );
}
