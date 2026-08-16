"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { format } from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, CalendarDayButton } from "@/components/ui/calendar";
import { TimeSelect } from "@/components/time-select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { TriangleAlert } from "lucide-react";
import { buildLocationColorMap } from "@/lib/location-colors";
import { buildDayFillStyle } from "@/lib/availability-calendar";
import {
  getTrainerAvailabilityRanges,
  getTrainerOpenSlots,
  bookSessionAsTrainer,
} from "../dashboard/actions";
import { toast } from "sonner";
import type { Slot } from "@/lib/slots";

interface Location {
  id: string;
  name: string;
}
interface ClientProfile {
  id: string;
  full_name: string | null;
  email: string | null;
}
interface AvailabilityRow {
  location_id: string;
  date: string;
  start_time: string;
  end_time: string;
}

function timeToMinutes(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

export function TrainerBookingForm({
  locations,
  clientsByLocation,
  availability,
  initialLocationId,
}: {
  locations: Location[];
  clientsByLocation: Record<string, ClientProfile[]>;
  availability: AvailabilityRow[];
  initialLocationId?: string;
}) {
  const [locationId, setLocationId] = useState(initialLocationId ?? locations[0]?.id ?? "");
  const [clientId, setClientId] = useState("");
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loadingSlots, startLoadTransition] = useTransition();
  const [booking, setBooking] = useState(false);
  const [customMode, setCustomMode] = useState(false);
  const [customRanges, setCustomRanges] = useState<{ start_time: string; end_time: string }[]>([]);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  // Guards against a slower-to-resolve fetch from a previous date/location
  // pick overwriting the response for whatever's currently selected.
  const latestRequestRef = useRef(0);

  const clients = clientsByLocation[locationId] ?? [];
  const locationColorMap = useMemo(
    () => buildLocationColorMap(locations.map((l) => l.id)),
    [locations]
  );

  const availabilityByDate = useMemo(() => {
    const map = new Map<string, AvailabilityRow[]>();
    for (const row of availability) {
      if (row.location_id !== locationId) continue;
      const list = map.get(row.date) ?? [];
      list.push(row);
      map.set(row.date, list);
    }
    return map;
  }, [availability, locationId]);

  function handleLocationChange(value: string) {
    latestRequestRef.current += 1;
    setLocationId(value);
    setClientId("");
    setDate(undefined);
    setSlots([]);
    setCustomMode(false);
  }

  function handleClientChange(value: string) {
    latestRequestRef.current += 1;
    setClientId(value);
    setDate(undefined);
    setSlots([]);
    setCustomMode(false);
  }

  function handleDateChange(value: Date | undefined) {
    const requestId = (latestRequestRef.current += 1);
    setDate(value);
    setSlots([]);
    setCustomMode(false);
    if (!value) return;
    const dateISO = format(value, "yyyy-MM-dd");
    startLoadTransition(() => {
      getTrainerOpenSlots(locationId, dateISO).then((result) => {
        if (latestRequestRef.current === requestId) setSlots(result);
      });
      getTrainerAvailabilityRanges(locationId, dateISO).then((result) => {
        if (latestRequestRef.current === requestId) setCustomRanges(result);
      });
    });
  }

  function handleBookSlot(slot: Slot) {
    setBooking(true);
    const fd = new FormData();
    fd.set("location_id", locationId);
    fd.set("client_id", clientId);
    fd.set("start", slot.start);
    fd.set("end", slot.end);
    bookSessionAsTrainer(fd).then((result) => {
      setBooking(false);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Session booked");
      setSlots((prev) => prev.filter((s) => s.start !== slot.start));
    });
  }

  const customFits = useMemo(() => {
    if (customRanges.length === 0) return false;
    const start = timeToMinutes(startTime);
    const end = timeToMinutes(endTime);
    return customRanges.some(
      (r) => start >= timeToMinutes(r.start_time) && end <= timeToMinutes(r.end_time)
    );
  }, [customRanges, startTime, endTime]);

  function handleBookCustom() {
    if (!date || endTime <= startTime) {
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
      setCustomMode(false);
    });
  }

  if (locations.length === 0) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + 90);

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label>Location</Label>
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
          <Label>Client</Label>
          <Select value={clientId} onValueChange={handleClientChange} disabled={!locationId}>
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
      </div>

      {clientId && (
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
                components={{
                  DayButton: (props) => {
                    const dateKey = format(props.day.date, "yyyy-MM-dd");
                    const rows = availabilityByDate.get(dateKey) ?? [];
                    const showFill = !props.modifiers.selected && !props.modifiers.disabled;
                    const style = showFill ? buildDayFillStyle(rows, locationColorMap) : undefined;
                    return <CalendarDayButton {...props} style={style} />;
                  },
                }}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{date ? format(date, "EEEE, MMMM d") : "Available times"}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {!date ? (
                <p className="text-sm text-muted-foreground">Pick a date to see open times.</p>
              ) : loadingSlots ? (
                <p className="text-sm text-muted-foreground">Loading times…</p>
              ) : (
                <>
                  {slots.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No open times on this day.</p>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {slots.map((slot) => (
                        <Button
                          key={slot.start}
                          variant="cta"
                          size="sm"
                          disabled={booking}
                          onClick={() => handleBookSlot(slot)}
                          className="tabular-nums"
                        >
                          {format(new Date(slot.start), "h:mm a")}
                        </Button>
                      ))}
                    </div>
                  )}

                  {!customMode ? (
                    <button
                      type="button"
                      onClick={() => setCustomMode(true)}
                      className="self-start text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
                    >
                      Book outside your hours
                    </button>
                  ) : (
                    <div className="flex flex-col gap-3 rounded-md border border-border p-3">
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
                      {!customFits && (
                        <div className="flex items-start gap-2 rounded-md border border-cta/40 bg-cta/10 px-3 py-2 text-sm text-cta-foreground">
                          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-cta" />
                          <span>Outside your set hours — still bookable.</span>
                        </div>
                      )}
                      <Button
                        type="button"
                        variant="cta"
                        size="sm"
                        disabled={booking || endTime <= startTime}
                        onClick={handleBookCustom}
                        className="self-start"
                      >
                        {booking ? "Booking..." : "Book this time"}
                      </Button>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
