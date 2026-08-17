import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Role } from "@/lib/supabase/types";

type TypedClient = SupabaseClient<Database>;

interface LocationRow {
  id: string;
  name: string;
  address: string | null;
  timezone: string;
  owner_id: string;
  is_base: boolean;
  invite_code: string;
  created_at: string;
}

interface ProfileSummary {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
}

export async function getMyLocations(supabase: TypedClient, userId: string, role: Role) {
  // A single embedded-resource query (one Supabase round trip) instead of
  // fetching membership rows and then fetching locations by id separately.
  const { data, error } = await supabase
    .from("location_members")
    .select("locations(*)")
    .eq("user_id", userId)
    .eq("role", role)
    .eq("status", "active");
  if (error) throw error;

  const locations = ((data ?? []) as unknown as { locations: LocationRow | null }[])
    .map((row) => row.locations)
    .filter((l): l is LocationRow => l !== null);
  locations.sort((a, b) => a.name.localeCompare(b.name));
  return locations;
}

export async function getLocationMembersByRole(
  supabase: TypedClient,
  locationId: string,
  role: Role
) {
  const { data, error } = await supabase
    .from("location_members")
    .select("profiles(id, full_name, email, avatar_url)")
    .eq("location_id", locationId)
    .eq("role", role)
    .eq("status", "active");
  if (error) throw error;

  const profiles = ((data ?? []) as unknown as { profiles: ProfileSummary | null }[])
    .map((row) => row.profiles)
    .filter((p): p is ProfileSummary => p !== null);
  profiles.sort((a, b) => (a.full_name ?? "").localeCompare(b.full_name ?? ""));
  return profiles;
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
  // client_rosters has two FKs into profiles (trainer_id and client_id), so
  // the embed needs the !client_id hint to disambiguate which one to join.
  const { data, error } = await supabase
    .from("client_rosters")
    .select("profiles!client_id(id, full_name, email, avatar_url)")
    .eq("trainer_id", trainerId)
    .eq("location_id", locationId);
  if (error) throw error;

  const profiles = ((data ?? []) as unknown as { profiles: ProfileSummary | null }[])
    .map((row) => row.profiles)
    .filter((p): p is ProfileSummary => p !== null);
  profiles.sort((a, b) => (a.full_name ?? "").localeCompare(b.full_name ?? ""));
  return profiles;
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
