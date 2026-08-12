import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OnboardingFlow } from "./onboarding-flow";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: profile } = await supabase
    .from("profiles")
    .select("default_role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.default_role) {
    redirect(profile.default_role === "trainer" ? "/trainer/dashboard" : "/client/dashboard");
  }

  const { error } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-16">
      <OnboardingFlow error={error} userId={user.id} />
    </div>
  );
}
