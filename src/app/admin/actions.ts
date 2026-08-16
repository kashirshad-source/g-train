"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { slugifyUsername, usernameToSyntheticEmail } from "@/lib/username";

// Every trainer account an admin creates starts with this password and
// must change it before they can use anything else — see the
// must_change_password gate in middleware.ts.
const STARTING_PASSWORD = "Granite";

export async function createTrainerAccount(name: string): Promise<{ username?: string; error?: string }> {
  await requireAdmin();

  const trimmedName = name.trim();
  if (!trimmedName) return { error: "Enter their name." };

  const nameParts = trimmedName.split(/\s+/);
  const base = slugifyUsername(nameParts[nameParts.length - 1] ?? "");
  if (!base) return { error: "Enter a valid name." };

  const admin = createAdminClient();

  // Find any usernames already starting with the same base, so a second
  // "Smith" gets "smith2" instead of colliding with the first.
  const { data: existing } = await admin
    .from("profiles")
    .select("username")
    .ilike("username", `${base}%`);

  const taken = new Set((existing ?? []).map((p) => p.username));
  let username = base;
  let suffix = 2;
  while (taken.has(username)) {
    username = `${base}${suffix}`;
    suffix += 1;
  }

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: usernameToSyntheticEmail(username),
    password: STARTING_PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: trimmedName },
  });
  if (createError || !created.user) {
    return { error: "Couldn't create that account. Try again." };
  }

  const { error: profileError } = await admin
    .from("profiles")
    .update({
      full_name: trimmedName,
      username,
      default_role: "trainer",
      must_change_password: true,
      email: null,
    })
    .eq("id", created.user.id);
  if (profileError) {
    return { error: "Account was created but setup failed. Contact support." };
  }

  revalidatePath("/admin");
  return { username };
}
