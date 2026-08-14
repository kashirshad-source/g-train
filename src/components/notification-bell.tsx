"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { getMyNotifications, markNotificationsRead, type NotificationItem } from "@/app/actions";
import { offerSlotFromCancelledBooking } from "@/app/trainer/schedule/actions";
import { toast } from "sonner";

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [offeringId, setOfferingId] = useState<string | null>(null);

  useEffect(() => {
    getMyNotifications().then(({ items, unreadCount }) => {
      setItems(items);
      setUnreadCount(unreadCount);
    });
  }, []);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      getMyNotifications().then(({ items }) => setItems(items));
      if (unreadCount > 0) {
        markNotificationsRead().then(() => setUnreadCount(0));
      }
    }
  }

  function handleOffer(item: NotificationItem) {
    if (!item.offerableBookingId) return;
    setOfferingId(item.id);
    offerSlotFromCancelledBooking(item.offerableBookingId).then((result) => {
      setOfferingId(null);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Slot offered to clients");
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, offerableBookingId: null } : i))
      );
    });
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" title="Notifications">
          <Bell className="size-4" />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-cta text-[10px] font-semibold text-cta-foreground">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80">
        <PopoverHeader>
          <PopoverTitle>Notifications</PopoverTitle>
        </PopoverHeader>
        {items.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">Nothing yet.</p>
        ) : (
          <ul className="flex max-h-80 flex-col divide-y overflow-y-auto">
            {items.map((item) => (
              <li key={item.id} className="flex flex-col gap-1 py-2">
                <Link
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="flex flex-col gap-0.5 text-sm hover:text-foreground"
                >
                  <span>{item.body}</span>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                  </span>
                </Link>
                {item.offerableBookingId && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="self-start"
                    disabled={offeringId === item.id}
                    onClick={() => handleOffer(item)}
                  >
                    Offer this slot to clients
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}
