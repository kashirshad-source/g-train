interface CalendarEventInput {
  title: string;
  description?: string;
  location?: string;
  start: Date;
  end: Date;
}

function formatUtc(date: Date) {
  return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

export function googleCalendarUrl({ title, description, location, start, end }: CalendarEventInput) {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    dates: `${formatUtc(start)}/${formatUtc(end)}`,
    details: description ?? "",
    location: location ?? "",
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function escapeICSText(text: string) {
  return text.replace(/\\/g, "\\\\").replace(/[,;]/g, (m) => `\\${m}`).replace(/\n/g, "\\n");
}

export function icsDataUrl({ title, description, location, start, end }: CalendarEventInput) {
  const uid = `${start.getTime()}-${end.getTime()}@g-train`;
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//G-Train//Booking//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${formatUtc(new Date())}`,
    `DTSTART:${formatUtc(start)}`,
    `DTEND:${formatUtc(end)}`,
    `SUMMARY:${escapeICSText(title)}`,
    description ? `DESCRIPTION:${escapeICSText(description)}` : null,
    location ? `LOCATION:${escapeICSText(location)}` : null,
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter((line): line is string => line !== null);

  return `data:text/calendar;charset=utf-8,${encodeURIComponent(lines.join("\r\n"))}`;
}
