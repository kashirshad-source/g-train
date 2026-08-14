"use client";

import { useState, useTransition } from "react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { requestSlotOffer } from "../actions";
import { toast } from "sonner";

interface SlotOffer {
  id: string;
  location_id: string;
  start_time: string;
  end_time: string;
}
interface LocationRow {
  id: string;
  name: string;
}

export function OpenSlots({
  offers,
  locations,
  requestedIds,
}: {
  offers: SlotOffer[];
  locations: LocationRow[];
  requestedIds: string[];
}) {
  const [requested, setRequested] = useState(new Set(requestedIds));
  const [isPending, startTransition] = useTransition();
  const locationById = new Map(locations.map((l) => [l.id, l]));

  if (offers.length === 0) return null;

  function handleRequest(offerId: string) {
    startTransition(() => {
      requestSlotOffer(offerId).then((result) => {
        if (result?.error) {
          toast.error(result.error);
          return;
        }
        setRequested((prev) => new Set(prev).add(offerId));
        toast.success("Requested — your trainer will confirm.");
      });
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Open slots</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="flex flex-col divide-y">
          {offers.map((offer) => {
            const location = locationById.get(offer.location_id);
            const already = requested.has(offer.id);
            return (
              <li key={offer.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div>
                  <div className="font-medium">{location?.name ?? "Location"}</div>
                  <div className="text-sm text-muted-foreground">
                    {format(new Date(offer.start_time), "EEE MMM d, h:mm a")}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant={already ? "secondary" : "cta"}
                  disabled={isPending || already}
                  onClick={() => handleRequest(offer.id)}
                >
                  {already ? "Requested" : "Request this slot"}
                </Button>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
