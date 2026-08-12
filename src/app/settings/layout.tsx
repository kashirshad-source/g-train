import type { ReactNode } from "react";
import { requireProfile } from "@/lib/auth";
import { AppShell } from "@/components/app-shell";
import { TRAINER_NAV_ITEMS, CLIENT_NAV_ITEMS } from "@/lib/nav-items";

export default async function SettingsLayout({ children }: { children: ReactNode }) {
  const { profile } = await requireProfile();
  const navItems = profile.default_role === "trainer" ? TRAINER_NAV_ITEMS : CLIENT_NAV_ITEMS;

  return (
    <AppShell navItems={navItems} profile={profile}>
      {children}
    </AppShell>
  );
}
