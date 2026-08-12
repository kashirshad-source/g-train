"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { phoneToSyntheticEmail } from "@/lib/phone";

async function createAccountAndSignIn({
  phone,
  name,
  password,
  defaultRole,
}: {
  phone: string;
  name: string;
  password: string;
  defaultRole: "trainer" | "client";
}): Promise<{ userId?: string; error?: string }> {
  const admin = createAdminClient();
  const email = phoneToSyntheticEmail(phone);

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: name },
  });
  if (createError || !created.user) {
    return {
      error: createError?.message.includes("already been registered")
        ? "An account already exists for this invite. Try signing in instead."
        : "Couldn't create your account. Try again.",
    };
  }

  const { error: profileError } = await admin
    .from("profiles")
    .update({ phone, default_role: defaultRole, email: null })
    .eq("id", created.user.id);
  if (profileError) {
    return { error: "Your account was created but setup failed. Contact your trainer." };
  }

  const supabase = await createClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
  if (signInError) {
    return { error: "Account created — head to the sign-in page to log in." };
  }

  return { userId: created.user.id };
}

export async function acceptLocationInvite(
  inviteId: string,
  name: string,
  password: string
): Promise<{ error?: string }> {
  if (!name.trim()) return { error: "Enter your name." };
  if (password.length < 6) return { error: "Password must be at least 6 characters." };

  const admin = createAdminClient();
  const { data: invite } = await admin
    .from("location_invites")
    .select("phone, role, status")
    .eq("id", inviteId)
    .maybeSingle();

  if (!invite || invite.status !== "pending") {
    return { error: "This invite is no longer valid." };
  }

  const result = await createAccountAndSignIn({
    phone: invite.phone,
    name: name.trim(),
    password,
    defaultRole: invite.role as "trainer" | "client",
  });
  if (result.error) return result;

  redirect(invite.role === "trainer" ? "/trainer/dashboard" : "/client/dashboard");
}

export async function acceptTrainerInvite(
  code: string,
  name: string,
  password: string
): Promise<{ error?: string }> {
  if (!name.trim()) return { error: "Enter your name." };
  if (password.length < 6) return { error: "Password must be at least 6 characters." };

  const admin = createAdminClient();
  const { data: invite } = await admin
    .from("admin_trainer_invites")
    .select("id, phone, status")
    .eq("code", code)
    .maybeSingle();

  if (!invite || invite.status !== "pending" || !invite.phone) {
    return { error: "This invite is no longer valid." };
  }

  const result = await createAccountAndSignIn({
    phone: invite.phone,
    name: name.trim(),
    password,
    defaultRole: "trainer",
  });
  if (result.error) return result;

  await admin
    .from("admin_trainer_invites")
    .update({ status: "accepted", accepted_at: new Date().toISOString(), accepted_by: result.userId })
    .eq("id", invite.id);

  redirect("/trainer/dashboard");
}
