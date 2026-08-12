"use client";

import { CalendarPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { googleCalendarUrl, icsDataUrl } from "@/lib/calendar-links";

export function AddToCalendar({
  title,
  description,
  location,
  start,
  end,
}: {
  title: string;
  description?: string;
  location?: string;
  start: string; // ISO
  end: string; // ISO
}) {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const input = { title, description, location, start: startDate, end: endDate };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <CalendarPlus className="mr-1.5 size-4" />
          Add to calendar
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <a href={googleCalendarUrl(input)} target="_blank" rel="noopener noreferrer">
            Google Calendar
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a href={icsDataUrl(input)} download="session.ics">
            Apple / Outlook (.ics)
          </a>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
