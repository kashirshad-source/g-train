import type { ReactNode } from "react";
import { requireUserWithRole } from "@/lib/auth";
import { AppShell } from "@/components/app-shell";
import { TRAINER_NAV_ITEMS, ADMIN_NAV_ITEM } from "@/lib/nav-items";

export default async function TrainerLayout({ children }: { children: ReactNode }) {
  const { profile } = await requireUserWithRole("trainer");
  const navItems = profile.is_admin ? [...TRAINER_NAV_ITEMS, ADMIN_NAV_ITEM] : TRAINER_NAV_ITEMS;

  return (
    <AppShell navItems={navItems} profile={profile}>
      {children}
    </AppShell>
  );
}
