"use client";

import { useMemo, useState, useTransition } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, CalendarDayButton } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { TimeSelect } from "@/components/time-select";
import { AddToCalendar } from "@/components/add-to-calendar";
import { buildLocationColorMap, DEFAULT_LOCATION_COLOR } from "@/lib/location-colors";
import { buildDayFillStyle } from "@/lib/availability-calendar";
import { format, startOfDay } from "date-fns";
import {
  addAvailability,
  deleteAvailability,
  addRecurringBlock,
  deleteRecurringBlock,
  markBookingComplete,
  cancelBooking,
  confirmSlotOffer,
  closeSlotOffer,
} from "./actions";
import { X } from "lucide-react";
import { toast } from "sonner";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

interface Location {
  id: string;
  name: string;
}
interface AvailabilityRow {
  id: string;
  location_id: string;
  date: string;
  start_time: string;
  end_time: string;
}
interface RecurringBlockRow {
  id: string;
  location_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  label: string | null;
  starts_on: string;
  ends_on: string | null;
}
interface BookingRow {
  id: string;
  location_id: string;
  client_id: string;
  start_time: string;
  end_time: string;
  status: string;
  notes: string | null;
}
interface ClientProfile {
  id: string;
  full_name: string | null;
  email: string | null;
}
interface SlotOfferRow {
  id: string;
  location_id: string;
  start_time: string;
  end_time: string;
  status: string;
}
interface SlotOfferRequestRow {
  id: string;
  slot_offer_id: string;
  client_id: string;
}

export function ScheduleManager({
  locations,
  availability,
  bookings,
  clients,
  recurringBlocks,
  slotOffers,
  slotOfferRequests,
}: {
  locations: Location[];
  availability: AvailabilityRow[];
  bookings: BookingRow[];
  clients: ClientProfile[];
  recurringBlocks: RecurringBlockRow[];
  slotOffers: SlotOfferRow[];
  slotOfferRequests: SlotOfferRequestRow[];
}) {
  const [formLocationId, setFormLocationId] = useState(locations[0]?.id ?? "");
  const [selectedDates, setSelectedDates] = useState<Date[] | undefined>(undefined);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");
  const [blockLocationId, setBlockLocationId] = useState(locations[0]?.id ?? "");
  const [blockDayOfWeek, setBlockDayOfWeek] = useState("2");
  const [blockStartTime, setBlockStartTime] = useState("18:00");
  const [blockEndTime, setBlockEndTime] = useState("19:00");
  const [cancelTarget, setCancelTarget] = useState<BookingRow | null>(null);
  const [offerSlotChecked, setOfferSlotChecked] = useState(false);
  const [isPending, startTransition] = useTransition();
  const clientById = useMemo(() => new Map(clients.map((c) => [c.id, c])), [clients]);
  const locationById = useMemo(() => new Map(locations.map((l) => [l.id, l])), [locations]);
  const locationColorMap = useMemo(
    () => buildLocationColorMap(locations.map((l) => l.id)),
    [locations]
  );
  const requestsByOffer = useMemo(() => {
    const map = new Map<string, SlotOfferRequestRow[]>();
    for (const req of slotOfferRequests) {
      const list = map.get(req.slot_offer_id) ?? [];
      list.push(req);
      map.set(req.slot_offer_id, list);
    }
    return map;
  }, [slotOfferRequests]);

  const availabilityByDate = useMemo(() => {
    const map = new Map<string, AvailabilityRow[]>();
    for (const row of availability) {
      const list = map.get(row.date) ?? [];
      list.push(row);
      map.set(row.date, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.start_time.localeCompare(b.start_time));
    }
    return map;
  }, [availability]);

  if (locations.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">
        Set up a location first from the Locations page before managing your schedule.
      </div>
    );
  }

  const availableDates = [...availabilityByDate.keys()].map((d) => new Date(`${d}T00:00:00`));

  const selectedDateKeys = (selectedDates ?? []).map((d) => format(d, "yyyy-MM-dd")).sort();
  const selectedDayRows =
    selectedDateKeys.length === 1 ? availabilityByDate.get(selectedDateKeys[0]) ?? [] : [];

  const sortedBookings = [...bookings].sort((a, b) => a.start_time.localeCompare(b.start_time));

  function handleDelete(id: string) {
    startTransition(() => {
      deleteAvailability(id).then(() => toast.success("Availability removed"));
    });
  }

  function handleAddHours() {
    if (selectedDateKeys.length === 0) return;
    if (endTime <= startTime) {
      toast.error("End time must be after start time");
      return;
    }
    startTransition(() => {
      Promise.all(
        selectedDateKeys.map((date) => {
          const fd = new FormData();
          fd.set("location_id", formLocationId);
          fd.set("date", date);
          fd.set("start_time", startTime);
          fd.set("end_time", endTime);
          return addAvailability(fd);
        })
      ).then((results) => {
        const failed = results.filter((r) => r?.error);
        if (failed.length > 0) {
          toast.error(failed[0]?.error ?? "Couldn't save some of those hours.");
          return;
        }
        toast.success(
          selectedDateKeys.length === 1 ? "Hours added" : `Hours added to ${selectedDateKeys.length} days`
        );
        setSelectedDates(undefined);
      });
    });
  }

  function handleAddBlock(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    if (blockEndTime <= blockStartTime) {
      toast.error("End time must be after start time");
      return;
    }
    const fd = new FormData(form);
    fd.set("location_id", blockLocationId);
    fd.set("day_of_week", blockDayOfWeek);
    fd.set("start_time", blockStartTime);
    fd.set("end_time", blockEndTime);
    startTransition(() => {
      addRecurringBlock(fd).then((result) => {
        if (result?.error) {
          toast.error(result.error);
          return;
        }
        toast.success("Recurring block added");
        form.reset();
      });
    });
  }

  function handleDeleteBlock(id: string) {
    startTransition(() => {
      deleteRecurringBlock(id).then(() => toast.success("Recurring block removed"));
    });
  }

  function handleMarkComplete(id: string) {
    startTransition(() => {
      markBookingComplete(id).then(() => toast.success("Session marked complete"));
    });
  }

  function handleConfirmCancel() {
    if (!cancelTarget) return;
    const target = cancelTarget;
    const offerSlot = offerSlotChecked;
    setCancelTarget(null);
    setOfferSlotChecked(false);
    startTransition(() => {
      cancelBooking(target.id, offerSlot).then(() =>
        toast.success(offerSlot ? "Session cancelled — slot offered to clients" : "Session cancelled")
      );
    });
  }

  function handleConfirmOffer(offer: SlotOfferRow, clientId: string) {
    startTransition(() => {
      confirmSlotOffer(offer.id, clientId, offer.location_id, offer.start_time, offer.end_time).then(
        (result) => {
          if (result?.error) {
            toast.error(result.error);
            return;
          }
          toast.success("Booking confirmed");
        }
      );
    });
  }

  function handleCloseOffer(id: string) {
    startTransition(() => {
      closeSlotOffer(id).then(() => toast.success("Offer closed"));
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold">Schedule</h1>
        <p className="text-muted-foreground">Your availability and bookings.</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {locations.map((loc) => {
          const color = (locationColorMap.get(loc.id) ?? DEFAULT_LOCATION_COLOR);
          return (
            <span
              key={loc.id}
              className="flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-xs font-medium"
            >
              <span className="size-2 rounded-full" style={{ backgroundColor: color.dot }} />
              {loc.name}
            </span>
          );
        })}
      </div>

      <Tabs defaultValue="availability">
        <TabsList>
          <TabsTrigger value="availability">Availability</TabsTrigger>
          <TabsTrigger value="bookings">Bookings</TabsTrigger>
          <TabsTrigger value="blocks">Recurring commitments</TabsTrigger>
        </TabsList>

        <TabsContent value="availability">
          <Card>
            <CardHeader>
              <CardTitle>Availability</CardTitle>
              <CardDescription>Tap a date to set your hours.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-6 lg:flex-row lg:items-start">
              <div className="overflow-x-auto">
                <Calendar
                  mode="multiple"
                  numberOfMonths={1}
                  selected={selectedDates}
                  onSelect={setSelectedDates}
                  disabled={{ before: startOfDay(new Date()) }}
                  className="[--cell-size:2.5rem]"
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
              </div>

              <div className="flex w-full flex-col gap-4 lg:max-w-xs lg:border-l lg:pl-6">
                {selectedDateKeys.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Pick a date to set hours.</p>
                ) : (
                  <>
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm font-medium">
                        {selectedDateKeys.length === 1
                          ? format(new Date(`${selectedDateKeys[0]}T00:00:00`), "EEEE, MMMM d")
                          : `${selectedDateKeys.length} dates selected`}
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedDates(undefined)}
                        className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
                      >
                        Clear
                      </button>
                    </div>

                    {selectedDateKeys.length === 1 &&
                      (selectedDayRows.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No hours set for this day.</p>
                      ) : (
                        <ul className="flex flex-col divide-y">
                          {selectedDayRows.map((slot) => {
                            const color = (locationColorMap.get(slot.location_id) ?? DEFAULT_LOCATION_COLOR);
                            return (
                              <li key={slot.id} className="flex items-center justify-between py-2">
                                <div className="flex items-center gap-2">
                                  <span
                                    className="size-2 shrink-0 rounded-full"
                                    style={{ backgroundColor: color.dot }}
                                  />
                                  <div className="flex flex-col">
                                    <span className="text-xs text-muted-foreground">
                                      {locationById.get(slot.location_id)?.name ?? "Location"}
                                    </span>
                                    <span className="text-sm tabular-nums">
                                      {formatTime(slot.start_time)} – {formatTime(slot.end_time)}
                                    </span>
                                  </div>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  disabled={isPending}
                                  onClick={() => handleDelete(slot.id)}
                                >
                                  <X className="size-4" />
                                </Button>
                              </li>
                            );
                          })}
                        </ul>
                      ))}

                    <div className="flex flex-col gap-3 rounded-md border border-border p-3">
                      <div className="flex flex-col gap-1.5">
                        <Label>Location</Label>
                        <Select value={formLocationId} onValueChange={setFormLocationId}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {locations.map((loc) => {
                              const color = (locationColorMap.get(loc.id) ?? DEFAULT_LOCATION_COLOR);
                              return (
                                <SelectItem key={loc.id} value={loc.id}>
                                  <span className="flex items-center gap-2">
                                    <span
                                      className="size-2 rounded-full"
                                      style={{ backgroundColor: color.dot }}
                                    />
                                    {loc.name}
                                  </span>
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <Label>Start</Label>
                        <TimeSelect value={startTime} onChange={setStartTime} />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <Label>End</Label>
                        <TimeSelect value={endTime} onChange={setEndTime} />
                      </div>
                      <Button type="button" variant="cta" disabled={isPending} onClick={handleAddHours}>
                        {selectedDateKeys.length === 1
                          ? "Add hours"
                          : `Add hours to ${selectedDateKeys.length} days`}
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bookings">
          <Card>
            <CardContent className="pt-6">
              {sortedBookings.length === 0 ? (
                <p className="text-sm text-muted-foreground">No upcoming bookings.</p>
              ) : (
                <ul className="flex flex-col divide-y">
                  {sortedBookings.map((booking) => {
                    const client = clientById.get(booking.client_id);
                    const location = locationById.get(booking.location_id);
                    const color = (locationColorMap.get(booking.location_id) ?? DEFAULT_LOCATION_COLOR);
                    return (
                      <li
                        key={booking.id}
                        className="flex flex-wrap items-center justify-between gap-3 py-3"
                      >
                        <div>
                          <div className="font-medium">
                            {client?.full_name ?? client?.email ?? "Client"}
                          </div>
                          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                            <span
                              className="size-1.5 rounded-full"
                              style={{ backgroundColor: color.dot }}
                            />
                            {location?.name ?? "Location"} ·{" "}
                            <span className="tabular-nums">
                              {format(new Date(booking.start_time), "EEE MMM d, h:mm a")}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="secondary">{booking.status}</Badge>
                          <AddToCalendar
                            title={`Training session with ${client?.full_name ?? client?.email ?? "client"}`}
                            location={location?.name}
                            start={booking.start_time}
                            end={booking.end_time}
                          />
                          {booking.status === "confirmed" && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={isPending}
                                onClick={() => handleMarkComplete(booking.id)}
                              >
                                Mark complete
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                disabled={isPending}
                                onClick={() => setCancelTarget(booking)}
                              >
                                Cancel
                              </Button>
                            </>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>

          {slotOffers.length > 0 && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Open slots</CardTitle>
                <CardDescription>
                  Slots you&apos;ve offered to clients after a cancellation.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="flex flex-col divide-y">
                  {slotOffers.map((offer) => {
                    const location = locationById.get(offer.location_id);
                    const requests = requestsByOffer.get(offer.id) ?? [];
                    return (
                      <li key={offer.id} className="flex flex-col gap-2 py-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <div className="font-medium">{location?.name ?? "Location"}</div>
                            <div className="text-sm tabular-nums text-muted-foreground">
                              {format(new Date(offer.start_time), "EEE MMM d, h:mm a")}
                            </div>
                          </div>
                          <Badge
                            variant={offer.status === "open" ? "secondary" : "outline"}
                          >
                            {offer.status}
                          </Badge>
                        </div>

                        {offer.status === "open" && (
                          <>
                            {requests.length === 0 ? (
                              <p className="text-xs text-muted-foreground">
                                No requests yet.
                              </p>
                            ) : (
                              <ul className="flex flex-col gap-1.5">
                                {requests.map((req) => {
                                  const client = clientById.get(req.client_id);
                                  return (
                                    <li
                                      key={req.id}
                                      className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-1.5 text-sm"
                                    >
                                      <span>{client?.full_name ?? client?.email ?? "Client"}</span>
                                      <Button
                                        size="sm"
                                        variant="cta"
                                        disabled={isPending}
                                        onClick={() => handleConfirmOffer(offer, req.client_id)}
                                      >
                                        Confirm
                                      </Button>
                                    </li>
                                  );
                                })}
                              </ul>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              className="self-start"
                              disabled={isPending}
                              onClick={() => handleCloseOffer(offer.id)}
                            >
                              Close without filling
                            </Button>
                          </>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="blocks">
          <Card>
            <CardHeader>
              <CardTitle>Recurring commitments</CardTitle>
              <CardDescription>Weekly commitments that block bookings. Only you see them.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-6">
              <form onSubmit={handleAddBlock} className="flex flex-col gap-3 rounded-md border border-border p-3 sm:flex-row sm:flex-wrap sm:items-end">
                <div className="flex flex-col gap-1.5">
                  <Label>Location</Label>
                  <Select value={blockLocationId} onValueChange={setBlockLocationId}>
                    <SelectTrigger className="w-48">
                      <SelectValue />
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
                  <Label>Day</Label>
                  <Select value={blockDayOfWeek} onValueChange={setBlockDayOfWeek}>
                    <SelectTrigger className="w-36">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DAYS.map((day, i) => (
                        <SelectItem key={day} value={String(i)}>
                          {day}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Start</Label>
                  <TimeSelect value={blockStartTime} onChange={setBlockStartTime} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>End</Label>
                  <TimeSelect value={blockEndTime} onChange={setBlockEndTime} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="block-label">Label (just for you)</Label>
                  <input
                    id="block-label"
                    name="label"
                    placeholder="Spin class"
                    className="h-9 w-40 rounded-md border border-input bg-transparent px-3 text-sm"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="block-ends-on">Ends on (optional)</Label>
                  <input
                    id="block-ends-on"
                    name="ends_on"
                    type="date"
                    className="h-9 w-40 rounded-md border border-input bg-transparent px-3 text-sm"
                  />
                </div>
                <Button type="submit" variant="cta" disabled={isPending}>
                  Add
                </Button>
              </form>

              {recurringBlocks.length === 0 ? (
                <p className="text-sm text-muted-foreground">None yet.</p>
              ) : (
                <ul className="flex flex-col divide-y">
                  {recurringBlocks.map((block) => (
                    <li key={block.id} className="flex items-center justify-between py-2">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">
                          {block.label || "Blocked"} · {DAYS[block.day_of_week]}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {locationById.get(block.location_id)?.name ?? "Location"} ·{" "}
                          <span className="tabular-nums">
                            {formatTime(block.start_time)} – {formatTime(block.end_time)}
                          </span>{" "}
                          · {block.ends_on ? `until ${block.ends_on}` : "ongoing"}
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={isPending}
                        onClick={() => handleDeleteBlock(block.id)}
                      >
                        <X className="size-4" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={!!cancelTarget} onOpenChange={(open) => !open && setCancelTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel session?</DialogTitle>
            {cancelTarget && (
              <DialogDescription>
                {clientById.get(cancelTarget.client_id)?.full_name ??
                  clientById.get(cancelTarget.client_id)?.email ??
                  "This client"}{" "}
                · {format(new Date(cancelTarget.start_time), "EEE MMM d, h:mm a")}
              </DialogDescription>
            )}
          </DialogHeader>
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={offerSlotChecked}
              onChange={(e) => setOfferSlotChecked(e.target.checked)}
              className="mt-0.5 size-4 rounded border-input"
            />
            Offer this slot to clients at this location
          </label>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCancelTarget(null)}>
              Never mind
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isPending}
              onClick={handleConfirmCancel}
            >
              Cancel session
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function formatTime(t: string) {
  const [h, m] = t.split(":").map(Number);
  const date = new Date();
  date.setHours(h, m, 0, 0);
  return format(date, "h:mm a");
}
