"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { ProfileAvatar } from "@/components/profile-avatar";
import { Button } from "@/components/ui/button";
import { NotificationBell } from "@/components/notification-bell";
import { cn } from "@/lib/utils";
import { LOGO_PATH } from "@/lib/logo-version";
import { LogOut } from "lucide-react";
import { signOut } from "@/app/actions";

export interface NavItem {
  href: string;
  label: string;
  icon: ReactNode;
}

export function AppShell({
  navItems,
  profile,
  children,
}: {
  navItems: NavItem[];
  profile: {
    full_name: string | null;
    email: string | null;
    phone: string | null;
    avatar_url: string | null;
  };
  children: ReactNode;
}) {
  const pathname = usePathname();
  const displayName = profile.full_name ?? profile.email ?? profile.phone ?? "?";

  return (
    <div className="flex min-h-screen flex-col sm:flex-row">
      <aside className="steel-texture flex w-full flex-row items-center justify-between gap-4 border-b border-sidebar-border p-4 text-sidebar-foreground sm:w-60 sm:flex-col sm:items-stretch sm:justify-start sm:border-b-0 sm:border-r">
        <div className="flex items-center justify-between gap-2 px-1 sm:mb-4 sm:px-2">
          <Link href="/" className="flex items-center">
            <Image
              src={LOGO_PATH}
              alt="G-Train"
              width={56}
              height={56}
              className="rounded-full"
              priority
            />
          </Link>
          <NotificationBell />
        </div>

        <nav className="flex flex-1 items-center gap-1 overflow-x-auto sm:flex-none sm:flex-col sm:items-stretch sm:overflow-visible">
          {navItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {item.icon}
                <span className="hidden sm:inline">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="hidden items-center gap-2 border-t pt-4 sm:mt-auto sm:flex">
          <ProfileAvatar
            avatarUrl={profile.avatar_url}
            fallback={displayName[0]?.toUpperCase() ?? "?"}
            className="size-8"
          />
          <div className="flex-1 truncate text-sm font-medium">{displayName}</div>
          <form action={signOut}>
            <Button variant="ghost" size="icon" type="submit" title="Sign out">
              <LogOut className="size-4" />
            </Button>
          </form>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-5xl px-6 py-8">{children}</div>
      </main>
    </div>
  );
}
