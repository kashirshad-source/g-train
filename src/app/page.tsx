import Image from "next/image";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EmailSignInForm } from "@/components/auth/email-sign-in-form";
import { LOGO_PATH } from "@/lib/logo-version";
import { CalendarClock, MapPin } from "lucide-react";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("default_role")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile?.default_role) {
      redirect("/onboarding");
    }
    redirect(profile.default_role === "trainer" ? "/trainer/dashboard" : "/client/dashboard");
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between px-6 py-5 sm:px-10">
        <Image
          src={LOGO_PATH}
          alt="G-Train"
          width={56}
          height={56}
          className="rounded-full"
          priority
        />
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
        <Image
          src={LOGO_PATH}
          alt="G-Train — Personal Training Booking Site"
          width={112}
          height={112}
          className="mb-8 rounded-full shadow-[0_0_0_1px_rgba(15,23,42,0.06),0_20px_50px_-15px_rgba(15,23,42,0.3)]"
          priority
        />
        <h1 className="font-heading max-w-2xl text-4xl font-semibold tracking-tight sm:text-5xl">
          Run your training business from one place
        </h1>
        <p className="mt-5 max-w-xl text-lg text-muted-foreground">
          Scheduling and bookings for personal trainers and their clients —
          across every location you train at.
        </p>
        <div className="mt-8 flex flex-col items-center gap-4">
          <EmailSignInForm />
        </div>

        <div className="mt-20 grid w-full max-w-2xl gap-6 text-left sm:grid-cols-2">
          <Feature
            icon={<CalendarClock className="size-5" />}
            title="Scheduling & booking"
            description="Trainers publish availability, clients book sessions instantly, everyone sees it on their dashboard."
          />
          <Feature
            icon={<MapPin className="size-5" />}
            title="Multiple locations"
            description="Manage several training locations and trainers under one account with role-based access."
          />
        </div>
      </main>

      <footer className="flex items-center justify-center px-6 py-8">
        <Image
          src={LOGO_PATH}
          alt="G-Train"
          width={28}
          height={28}
          className="rounded-full opacity-80"
        />
      </footer>
    </div>
  );
}

function Feature({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="steel-panel flex flex-col gap-2 rounded-xl border border-border p-5">
      <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </div>
      <h3 className="font-medium">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
