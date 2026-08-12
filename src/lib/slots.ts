export interface AvailabilityRange {
  start_time: string; // "HH:MM:SS"
  end_time: string; // "HH:MM:SS"
}

export interface BookingRange {
  start_time: string; // ISO timestamp
  end_time: string; // ISO timestamp
}

export interface Slot {
  start: string; // ISO timestamp
  end: string; // ISO timestamp
}

/**
 * Turns a trainer's recurring availability windows for a single day into
 * concrete bookable slots, filtering out ones that overlap an existing
 * booking or have already passed.
 */
export function buildSlotsForDay(
  availability: AvailabilityRange[],
  bookings: BookingRange[],
  dateISO: string, // "YYYY-MM-DD", interpreted in the browser/server local timezone
  slotMinutes = 60
): Slot[] {
  const slots: Slot[] = [];
  const now = Date.now();

  for (const range of availability) {
    const [startH, startM] = range.start_time.split(":").map(Number);
    const [endH, endM] = range.end_time.split(":").map(Number);

    const cursor = new Date(`${dateISO}T00:00:00`);
    cursor.setHours(startH, startM, 0, 0);
    const rangeEnd = new Date(`${dateISO}T00:00:00`);
    rangeEnd.setHours(endH, endM, 0, 0);

    while (cursor.getTime() + slotMinutes * 60_000 <= rangeEnd.getTime()) {
      const slotStart = new Date(cursor);
      const slotEnd = new Date(cursor.getTime() + slotMinutes * 60_000);

      const isPast = slotStart.getTime() < now;
      const overlapsBooking = bookings.some((b) => {
        const bStart = new Date(b.start_time).getTime();
        const bEnd = new Date(b.end_time).getTime();
        return slotStart.getTime() < bEnd && slotEnd.getTime() > bStart;
      });

      if (!isPast && !overlapsBooking) {
        slots.push({ start: slotStart.toISOString(), end: slotEnd.toISOString() });
      }

      cursor.setTime(cursor.getTime() + slotMinutes * 60_000);
    }
  }

  return slots.sort((a, b) => a.start.localeCompare(b.start));
}
