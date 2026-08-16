import {
  LayoutDashboard,
  CalendarClock,
  CalendarPlus,
  MapPin,
  Settings,
  ShieldCheck,
} from "lucide-react";
import type { NavItem } from "@/components/app-shell";

export const TRAINER_NAV_ITEMS: NavItem[] = [
  { href: "/trainer/dashboard", label: "Dashboard", icon: <LayoutDashboard className="size-4" /> },
  { href: "/trainer/schedule", label: "Schedule", icon: <CalendarClock className="size-4" /> },
  { href: "/trainer/locations", label: "Locations", icon: <MapPin className="size-4" /> },
  { href: "/settings", label: "Settings", icon: <Settings className="size-4" /> },
];

export const CLIENT_NAV_ITEMS: NavItem[] = [
  { href: "/client/dashboard", label: "Dashboard", icon: <LayoutDashboard className="size-4" /> },
  { href: "/client/book", label: "Book a session", icon: <CalendarPlus className="size-4" /> },
  { href: "/client/locations", label: "Locations", icon: <MapPin className="size-4" /> },
  { href: "/settings", label: "Settings", icon: <Settings className="size-4" /> },
];

export const ADMIN_NAV_ITEM: NavItem = {
  href: "/admin",
  label: "Admin",
  icon: <ShieldCheck className="size-4" />,
};
