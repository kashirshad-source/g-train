import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Role } from "@/lib/supabase/types";

type TypedClient = SupabaseClient<Database>;

export async function getMyLocations(supabase: TypedClient, userId: string, role: Role) {
  const { data: memberships, error: mErr } = await supabase
    .from("location_members")
    .select("location_id")
    .eq("user_id", userId)
    .eq("role", role)
    .eq("status", "active");
  if (mErr) throw mErr;

  const locationIds = (memberships ?? []).map((m) => m.location_id);
  if (locationIds.length === 0) return [];

  const { data: locations, error: lErr } = await supabase
    .from("locations")
    .select("*")
    .in("id", locationIds)
    .order("name");
  if (lErr) throw lErr;

  return locations ?? [];
}

export async function getLocationMembersByRole(
  supabase: TypedClient,
  locationId: string,
  role: Role
) {
  const { data: memberships, error: mErr } = await supabase
    .from("location_members")
    .select("user_id")
    .eq("location_id", locationId)
    .eq("role", role)
    .eq("status", "active");
  if (mErr) throw mErr;

  const userIds = (memberships ?? []).map((m) => m.user_id);
  if (userIds.length === 0) return [];

  const { data: profiles, error: pErr } = await supabase
    .from("profiles")
    .select("id, full_name, email, avatar_url")
    .in("id", userIds)
    .order("full_name");
  if (pErr) throw pErr;

  return profiles ?? [];
}

/**
 * A client is only "on the roster" for the trainer(s) who've actually
 * rostered them at that location — via an accepted invite or a booking —
 * not everyone who's a member of the location.
 */
export async function getRosteredClients(
  supabase: TypedClient,
  trainerId: string,
  locationId: string
) {
  const { data: rosterRows, error: rErr } = await supabase
    .from("client_rosters")
    .select("client_id")
    .eq("trainer_id", trainerId)
    .eq("location_id", locationId);
  if (rErr) throw rErr;

  const clientIds = [...new Set((rosterRows ?? []).map((r) => r.client_id))];
  if (clientIds.length === 0) return [];

  const { data: profiles, error: pErr } = await supabase
    .from("profiles")
    .select("id, full_name, email, avatar_url")
    .in("id", clientIds)
    .order("full_name");
  if (pErr) throw pErr;

  return profiles ?? [];
}

export async function getProfilesByIds(supabase: TypedClient, ids: string[]) {
  if (ids.length === 0) return [];
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, email, avatar_url")
    .in("id", ids);
  if (error) throw error;
  return data ?? [];
}
