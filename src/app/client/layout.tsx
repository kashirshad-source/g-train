import type { ReactNode } from "react";
import { requireUserWithRole } from "@/lib/auth";
import { AppShell } from "@/components/app-shell";
import { CLIENT_NAV_ITEMS, ADMIN_NAV_ITEM } from "@/lib/nav-items";

export default async function ClientLayout({ children }: { children: ReactNode }) {
  const { profile } = await requireUserWithRole("client");
  const navItems = profile.is_admin ? [...CLIENT_NAV_ITEMS, ADMIN_NAV_ITEM] : CLIENT_NAV_ITEMS;

  return (
    <AppShell navItems={navItems} profile={profile}>
      {children}
    </AppShell>
  );
}
