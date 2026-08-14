"use client";

import { useMemo, useState, useTransition } from "react";
import { format } from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { getAvailableSlots } from "./actions";
import { bookSession } from "../actions";
import { toast } from "sonner";
import type { Slot } from "@/lib/slots";

interface Location {
  id: string;
  name: string;
}
interface TrainerProfile {
  id: string;
  full_name: string | null;
  email: string | null;
}

export function BookingFlow({
  locations,
  trainersByLocation,
  initialLocationId,
  initialTrainerId,
}: {
  locations: Location[];
  trainersByLocation: Record<string, TrainerProfile[]>;
  initialLocationId?: string;
  initialTrainerId?: string;
}) {
  const [locationId, setLocationId] = useState(initialLocationId ?? locations[0]?.id ?? "");
  const [trainerId, setTrainerId] = useState<string>(initialTrainerId ?? "");
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loadingSlots, startLoadTransition] = useTransition();
  const [booking, startBookTransition] = useTransition();
  const [bookedSlot, setBookedSlot] = useState<string | null>(null);

  const trainers = useMemo(() => trainersByLocation[locationId] ?? [], [locationId, trainersByLocation]);

  function handleLocationChange(value: string) {
    setLocationId(value);
    setTrainerId("");
    setDate(undefined);
    setSlots([]);
  }

  function handleTrainerChange(value: string) {
    setTrainerId(value);
    setDate(undefined);
    setSlots([]);
  }

  function handleDateChange(value: Date | undefined) {
    setDate(value);
    setSlots([]);
    if (!value || !trainerId) return;
    const dateISO = format(value, "yyyy-MM-dd");
    startLoadTransition(() => {
      getAvailableSlots(trainerId, locationId, dateISO).then(setSlots);
    });
  }

  function handleBook(slot: Slot) {
    const fd = new FormData();
    fd.set("trainer_id", trainerId);
    fd.set("location_id", locationId);
    fd.set("start", slot.start);
    fd.set("end", slot.end);

    startBookTransition(() => {
      bookSession(fd).then((result) => {
        if (result?.error) {
          toast.error(result.error);
          return;
        }
        setBookedSlot(slot.start);
        toast.success("Session booked!");
        setSlots((prev) => prev.filter((s) => s.start !== slot.start));
      });
    });
  }

  if (locations.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">Join a location to book a session.</p>
    );
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + 30);

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Location</span>
          <Select value={locationId} onValueChange={handleLocationChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select a location" />
            </SelectTrigger>
            <SelectContent>
              {locations.map((loc) => (
                <SelectItem key={loc.id} value={loc.id}>
                  {loc.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Trainer</span>
          <Select value={trainerId} onValueChange={handleTrainerChange} disabled={trainers.length === 0}>
            <SelectTrigger>
              <SelectValue placeholder={trainers.length === 0 ? "No trainers here yet" : "Select a trainer"} />
            </SelectTrigger>
            <SelectContent>
              {trainers.map((trainer) => (
                <SelectItem key={trainer.id} value={trainer.id}>
                  {trainer.full_name ?? trainer.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {trainerId && (
        <div className="grid gap-6 sm:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Pick a date</CardTitle>
            </CardHeader>
            <CardContent>
              <Calendar
                mode="single"
                selected={date}
                onSelect={handleDateChange}
                disabled={{ before: today, after: maxDate }}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{date ? format(date, "EEEE, MMMM d") : "Available times"}</CardTitle>
            </CardHeader>
            <CardContent>
              {!date ? (
                <p className="text-sm text-muted-foreground">Pick a date to see open times.</p>
              ) : loadingSlots ? (
                <p className="text-sm text-muted-foreground">Loading times…</p>
              ) : slots.length === 0 ? (
                <p className="text-sm text-muted-foreground">No open times on this day.</p>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {slots.map((slot) => (
                    <Button
                      key={slot.start}
                      variant={bookedSlot === slot.start ? "secondary" : "cta"}
                      size="sm"
                      disabled={booking}
                      onClick={() => handleBook(slot)}
                      className="tabular-nums"
                    >
                      {format(new Date(slot.start), "h:mm a")}
                    </Button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
