"use client";

import { useTransition } from "react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AddToCalendar } from "@/components/add-to-calendar";
import { cancelBooking } from "../actions";
import { toast } from "sonner";

interface BookingRow {
  id: string;
  trainer_id: string;
  location_id: string;
  start_time: string;
  end_time: string;
  status: string;
}
interface TrainerProfile {
  id: string;
  full_name: string | null;
  email: string | null;
}
interface LocationRow {
  id: string;
  name: string;
}

export function UpcomingSessions({
  bookings,
  trainers,
  locations,
}: {
  bookings: BookingRow[];
  trainers: TrainerProfile[];
  locations: LocationRow[];
}) {
  const [isPending, startTransition] = useTransition();
  const trainerById = new Map(trainers.map((t) => [t.id, t]));
  const locationById = new Map(locations.map((l) => [l.id, l]));

  function handleCancel(id: string) {
    startTransition(() => {
      cancelBooking(id).then(() => toast.success("Session cancelled"));
    });
  }

  if (bookings.length === 0) {
    return <p className="text-sm text-muted-foreground">No upcoming sessions booked yet.</p>;
  }

  return (
    <ul className="flex flex-col divide-y">
      {bookings.map((booking) => {
        const trainer = trainerById.get(booking.trainer_id);
        const location = locationById.get(booking.location_id);
        return (
          <li key={booking.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
            <div>
              <div className="font-medium">{trainer?.full_name ?? trainer?.email ?? "Trainer"}</div>
              <div className="text-sm text-muted-foreground">
                {location?.name ?? "Location"} · {format(new Date(booking.start_time), "EEE MMM d, h:mm a")}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{booking.status}</Badge>
              <AddToCalendar
                title={`Training session with ${trainer?.full_name ?? trainer?.email ?? "trainer"}`}
                location={location?.name}
                start={booking.start_time}
                end={booking.end_time}
              />
              {booking.status === "confirmed" && (
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={isPending}
                  onClick={() => handleCancel(booking.id)}
                >
                  Cancel
                </Button>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
