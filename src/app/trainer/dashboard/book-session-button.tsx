"use client";

import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { TimeSelect } from "@/components/time-select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { CalendarPlus, TriangleAlert } from "lucide-react";
import { getTrainerAvailabilityRanges, bookSessionAsTrainer } from "./actions";
import { toast } from "sonner";

interface Location {
  id: string;
  name: string;
}
interface ClientProfile {
  id: string;
  full_name: string | null;
  email: string | null;
}

function timeToMinutes(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

export function BookSessionButton({
  locations,
  clientsByLocation,
}: {
  locations: Location[];
  clientsByLocation: Record<string, ClientProfile[]>;
}) {
  const [open, setOpen] = useState(false);
  const [locationId, setLocationId] = useState("");
  const [clientId, setClientId] = useState("");
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [ranges, setRanges] = useState<{ start_time: string; end_time: string }[]>([]);
  const [booking, setBooking] = useState(false);

  const clients = clientsByLocation[locationId] ?? [];

  useEffect(() => {
    if (!open) {
      setLocationId("");
      setClientId("");
      setDate(undefined);
      setStartTime("09:00");
      setEndTime("10:00");
      setRanges([]);
    }
  }, [open]);

  useEffect(() => {
    setClientId("");
  }, [locationId]);

  useEffect(() => {
    if (!locationId || !date) {
      setRanges([]);
      return;
    }
    const dateISO = format(date, "yyyy-MM-dd");
    getTrainerAvailabilityRanges(locationId, dateISO).then(setRanges);
  }, [locationId, date]);

  const fitsAvailability = useMemo(() => {
    if (ranges.length === 0) return false;
    const start = timeToMinutes(startTime);
    const end = timeToMinutes(endTime);
    return ranges.some(
      (r) => start >= timeToMinutes(r.start_time) && end <= timeToMinutes(r.end_time)
    );
  }, [ranges, startTime, endTime]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + 90);

  const canBook = locationId && clientId && date && endTime > startTime;

  function handleBook() {
    if (!canBook || !date) return;
    if (endTime <= startTime) {
      toast.error("End time must be after start time");
      return;
    }
    const dateISO = format(date, "yyyy-MM-dd");
    const fd = new FormData();
    fd.set("location_id", locationId);
    fd.set("client_id", clientId);
    fd.set("start", new Date(`${dateISO}T${startTime}:00`).toISOString());
    fd.set("end", new Date(`${dateISO}T${endTime}:00`).toISOString());

    setBooking(true);
    bookSessionAsTrainer(fd).then((result) => {
      setBooking(false);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Session booked");
      setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="cta">
          <CalendarPlus className="mr-1.5 size-4" />
          Book a session
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Book a session</DialogTitle>
          <DialogDescription>Doesn&apos;t have to fit your set hours.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Location</Label>
            <Select value={locationId} onValueChange={setLocationId}>
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
            <Label>Client</Label>
            <Select value={clientId} onValueChange={setClientId} disabled={!locationId}>
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    !locationId
                      ? "Pick a location first"
                      : clients.length === 0
                        ? "No clients at this location yet"
                        : "Select a client"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.full_name ?? c.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Date</Label>
            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              disabled={{ before: today, after: maxDate }}
              className="mx-auto"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Start</Label>
              <TimeSelect value={startTime} onChange={setStartTime} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>End</Label>
              <TimeSelect value={endTime} onChange={setEndTime} />
            </div>
          </div>

          {date && !fitsAvailability && (
            <div className="flex items-start gap-2 rounded-md border border-cta/40 bg-cta/10 px-3 py-2 text-sm text-cta-foreground">
              <TriangleAlert className="mt-0.5 size-4 shrink-0 text-cta" />
              <span>Outside your set hours — still bookable.</span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="cta" disabled={!canBook || booking} onClick={handleBook}>
            {booking ? "Booking..." : "Book session"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
