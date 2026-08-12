import type { ReactNode } from "react";
import { requireAdmin } from "@/lib/auth";
import { AppShell } from "@/components/app-shell";
import { TRAINER_NAV_ITEMS, CLIENT_NAV_ITEMS, ADMIN_NAV_ITEM } from "@/lib/nav-items";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const { profile } = await requireAdmin();
  const baseNav = profile.default_role === "client" ? CLIENT_NAV_ITEMS : TRAINER_NAV_ITEMS;

  return (
    <AppShell navItems={[...baseNav, ADMIN_NAV_ITEM]} profile={profile}>
      {children}
    </AppShell>
  );
}
