"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1);
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5);

function parse24Hour(value: string) {
  const [h, m] = value.split(":").map(Number);
  const period: "AM" | "PM" = h >= 12 ? "PM" : "AM";
  let hour12 = h % 12;
  if (hour12 === 0) hour12 = 12;
  return { hour12, minute: m, period };
}

function to24Hour(hour12: number, minute: number, period: "AM" | "PM") {
  let h = hour12 % 12;
  if (period === "PM") h += 12;
  return `${String(h).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

/**
 * Hour / minute / AM-PM dropdowns that always resolve to a complete,
 * unambiguous "HH:MM" (24h) value — avoids native <input type="time">,
 * whose browser-native validation can reject a value mid-edit.
 */
export function TimeSelect({
  value,
  onChange,
}: {
  value: string; // "HH:MM", 24h
  onChange: (value: string) => void;
}) {
  const { hour12, minute, period } = parse24Hour(value);

  return (
    <div className="flex items-center gap-1 tabular-nums">
      <Select
        value={String(hour12)}
        onValueChange={(v) => onChange(to24Hour(Number(v), minute, period))}
      >
        <SelectTrigger className="w-[4.25rem]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {HOURS.map((h) => (
            <SelectItem key={h} value={String(h)}>
              {h}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <span className="text-muted-foreground">:</span>
      <Select
        value={String(minute)}
        onValueChange={(v) => onChange(to24Hour(hour12, Number(v), period))}
      >
        <SelectTrigger className="w-[4.25rem]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {MINUTES.map((m) => (
            <SelectItem key={m} value={String(m)}>
              {String(m).padStart(2, "0")}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={period}
        onValueChange={(v) => onChange(to24Hour(hour12, minute, v as "AM" | "PM"))}
      >
        <SelectTrigger className="w-[4.5rem]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="AM">AM</SelectItem>
          <SelectItem value="PM">PM</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
