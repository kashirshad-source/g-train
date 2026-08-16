import { DEFAULT_LOCATION_COLOR, type LocationColor } from "@/lib/location-colors";
import type { CSSProperties } from "react";

export interface AvailabilityDayRow {
  location_id: string;
  start_time: string;
  end_time: string;
}

// A "full" training day runs 7am–9pm. Day-cell fills are sized to the
// fraction of that window each location actually covers, so a half-day of
// hours reads as a half-filled cell rather than a full block.
const DAY_START_MINUTES = 7 * 60;
const DAY_END_MINUTES = 21 * 60;
const DAY_WINDOW_MINUTES = DAY_END_MINUTES - DAY_START_MINUTES;

function timeToMinutes(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

/** Merges overlapping ranges within one location so double-booked hours aren't double-counted. */
function coverageMinutes(rows: AvailabilityDayRow[]) {
  const intervals = rows
    .map((r): [number, number] => [
      Math.max(timeToMinutes(r.start_time), DAY_START_MINUTES),
      Math.min(timeToMinutes(r.end_time), DAY_END_MINUTES),
    ])
    .filter(([start, end]) => end > start)
    .sort((a, b) => a[0] - b[0]);

  let total = 0;
  let curStart: number | null = null;
  let curEnd = 0;
  for (const [start, end] of intervals) {
    if (curStart === null) {
      curStart = start;
      curEnd = end;
    } else if (start <= curEnd) {
      curEnd = Math.max(curEnd, end);
    } else {
      total += curEnd - curStart;
      curStart = start;
      curEnd = end;
    }
  }
  if (curStart !== null) total += curEnd - curStart;
  return total;
}

/** Proportional left-to-right fill: each location gets a segment sized to its
 * share of the 7am–9pm day; whatever's left uncovered stays transparent. */
export function buildDayFillStyle(
  rows: AvailabilityDayRow[],
  colorMap: Map<string, LocationColor>
): CSSProperties | undefined {
  if (rows.length === 0) return undefined;

  const byLocation = new Map<string, AvailabilityDayRow[]>();
  for (const row of rows) {
    const list = byLocation.get(row.location_id) ?? [];
    list.push(row);
    byLocation.set(row.location_id, list);
  }

  let cursor = 0;
  const stops: string[] = [];
  for (const [locationId, locationRows] of byLocation) {
    const fraction = Math.min(coverageMinutes(locationRows) / DAY_WINDOW_MINUTES, 1);
    if (fraction <= 0) continue;
    const start = cursor;
    const end = Math.min(cursor + fraction * 100, 100);
    const color = colorMap.get(locationId) ?? DEFAULT_LOCATION_COLOR;
    stops.push(`${color.fill} ${start}% ${end}%`);
    cursor = end;
    if (cursor >= 100) break;
  }

  if (stops.length === 0) return undefined;
  if (cursor < 100) stops.push(`transparent ${cursor}% 100%`);
  return { background: `linear-gradient(90deg, ${stops.join(", ")})` };
}
