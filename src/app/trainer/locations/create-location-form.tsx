"use client";

import { useRef, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { createLocation } from "./actions";
import { toast } from "sonner";

export function CreateLocationForm() {
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function handleSubmit(formData: FormData) {
    startTransition(() => {
      createLocation(formData).then((result) => {
        if (result?.error) {
          toast.error(result.error);
          return;
        }
        toast.success("Location created");
        formRef.current?.reset();
      });
    });
  }

  return (
    <form ref={formRef} action={handleSubmit} className="flex flex-wrap items-end gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="name">Location name</Label>
        <Input id="name" name="name" placeholder="Downtown Studio" required />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="address">Address (optional)</Label>
        <Input id="address" name="address" placeholder="123 Main St" />
      </div>
      <Button type="submit" disabled={isPending}>
        {isPending ? "Creating..." : "Create"}
      </Button>
    </form>
  );
}
