"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { deleteLocation } from "./actions";
import { toast } from "sonner";

export function DeleteLocationButton({
  locationId,
  locationName,
}: {
  locationId: string;
  locationName: string;
}) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (
      !window.confirm(
        `Delete "${locationName}"? This removes its schedule, bookings, and roster for everyone. This can't be undone.`
      )
    ) {
      return;
    }
    startTransition(() => {
      deleteLocation(locationId).then((result) => {
        if (result?.error) {
          toast.error(result.error);
          return;
        }
        toast.success("Location deleted");
      });
    });
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      disabled={isPending}
      onClick={handleClick}
      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
    >
      Delete
    </Button>
  );
}
