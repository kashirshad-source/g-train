"use client";

import { useEffect, useState } from "react";
import { format, isSameDay } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { LocationColor } from "@/lib/location-colors";

export interface DaySheetAppointment {
  id: string;
  clientName: string;
  locationName: string;
  startTime: string;
  endTime: string;
  color: LocationColor;
}

const START_HOUR = 6;
const END_HOUR = 21;
const HOUR_HEIGHT = 64;
const MIN_EVENT_MINUTES = 20;

export function DaySheet({
  date,
  appointments,
}: {
  date: Date;
  appointments: DaySheetAppointment[];
}) {
  const totalMinutes = (END_HOUR - START_HOUR) * 60;
  const hours = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i);
  const [nowOffsetPct, setNowOffsetPct] = useState<number | null>(null);

  useEffect(() => {
    function update() {
      const now = new Date();
      if (!isSameDay(now, date)) {
        setNowOffsetPct(null);
        return;
      }
      const minutesFromStart = (now.getHours() - START_HOUR) * 60 + now.getMinutes();
      if (minutesFromStart < 0 || minutesFromStart > totalMinutes) {
        setNowOffsetPct(null);
        return;
      }
      setNowOffsetPct((minutesFromStart / totalMinutes) * 100);
    }
    update();
    const id = setInterval(update, 60_000);
    return () => clearInterval(id);
  }, [date, totalMinutes]);

  const positioned = layoutAppointments(appointments);
  const gridHeight = HOUR_HEIGHT * (END_HOUR - START_HOUR);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-heading text-xl">{format(date, "EEEE, MMMM d")}</CardTitle>
      </CardHeader>
      <CardContent>
        {appointments.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Nothing on the books today.
          </p>
        ) : (
          <div className="flex">
            <div
              className="flex shrink-0 select-none flex-col pr-2 text-right text-xs text-muted-foreground"
              style={{ width: 56 }}
            >
              {hours.map((h) => (
                <div key={h} style={{ height: HOUR_HEIGHT }} className="-translate-y-2">
                  {formatHourLabel(h)}
                </div>
              ))}
            </div>

            <div className="relative flex-1 border-l border-border" style={{ height: gridHeight }}>
              {hours.slice(0, -1).map((h, i) => (
                <div
                  key={h}
                  className="absolute left-0 right-0 border-t border-border/60"
                  style={{ top: i * HOUR_HEIGHT }}
                />
              ))}

              {nowOffsetPct !== null && (
                <div
                  className="absolute left-0 right-0 z-20 flex items-center gap-1"
                  style={{ top: `${nowOffsetPct}%` }}
                >
                  <div className="-ml-1 size-2 shrink-0 rounded-full bg-red-500" />
                  <div className="h-px flex-1 bg-red-500" />
                </div>
              )}

              {positioned.map(({ appt, topPct, heightPct, col, cols }) => (
                <div
                  key={appt.id}
                  className="absolute overflow-hidden rounded-md border-l-4 px-2 py-1 text-xs shadow-sm"
                  style={{
                    top: `${topPct}%`,
                    height: `${heightPct}%`,
                    left: `calc(${(col / cols) * 100}% + 2px)`,
                    width: `calc(${100 / cols}% - 4px)`,
                    backgroundColor: appt.color.bg,
                    borderLeftColor: appt.color.dot,
                    color: appt.color.text,
                  }}
                >
                  <div className="truncate font-medium">{appt.clientName}</div>
                  <div className="truncate opacity-80">
                    {format(new Date(appt.startTime), "h:mm a")}–
                    {format(new Date(appt.endTime), "h:mm a")} · {appt.locationName}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function formatHourLabel(hour: number) {
  const d = new Date();
  d.setHours(hour, 0, 0, 0);
  return format(d, "h a");
}

interface PositionedAppointment {
  appt: DaySheetAppointment;
  topPct: number;
  heightPct: number;
  col: number;
  cols: number;
}

/** Lays out appointments like Apple Calendar's day view: absolute-positioned
 * by time, with overlapping appointments splitting into side-by-side columns. */
function layoutAppointments(appointments: DaySheetAppointment[]): PositionedAppointment[] {
  const dayStart = START_HOUR * 60;
  const totalMinutes = (END_HOUR - START_HOUR) * 60;

  const withMinutes = appointments
    .map((appt) => {
      const s = new Date(appt.startTime);
      const e = new Date(appt.endTime);
      const startMin = clamp(s.getHours() * 60 + s.getMinutes(), dayStart, dayStart + totalMinutes);
      const rawEndMin = e.getHours() * 60 + e.getMinutes();
      const endMin = clamp(
        Math.max(rawEndMin, startMin + MIN_EVENT_MINUTES),
        startMin + MIN_EVENT_MINUTES,
        dayStart + totalMinutes
      );
      return { appt, startMin, endMin: Math.max(endMin, startMin + 1) };
    })
    .sort((a, b) => a.startMin - b.startMin);

  const clusters: (typeof withMinutes)[] = [];
  let current: typeof withMinutes = [];
  let clusterEnd = -Infinity;
  for (const item of withMinutes) {
    if (current.length === 0 || item.startMin < clusterEnd) {
      current.push(item);
      clusterEnd = Math.max(clusterEnd, item.endMin);
    } else {
      clusters.push(current);
      current = [item];
      clusterEnd = item.endMin;
    }
  }
  if (current.length > 0) clusters.push(current);

  const result: PositionedAppointment[] = [];
  for (const cluster of clusters) {
    const columnEnds: number[] = [];
    const withCol = cluster.map((item) => {
      let col = columnEnds.findIndex((end) => end <= item.startMin);
      if (col === -1) {
        col = columnEnds.length;
        columnEnds.push(item.endMin);
      } else {
        columnEnds[col] = item.endMin;
      }
      return { ...item, col };
    });
    const cols = columnEnds.length;
    for (const item of withCol) {
      result.push({
        appt: item.appt,
        topPct: ((item.startMin - dayStart) / totalMinutes) * 100,
        heightPct: ((item.endMin - item.startMin) / totalMinutes) * 100,
        col: item.col,
        cols,
      });
    }
  }
  return result;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
