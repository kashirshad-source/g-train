/**
 * Trainer accounts created directly by an admin log in with a plain
 * username (their last name) instead of a real email — Supabase Auth still
 * needs *some* unique email-shaped identifier under the hood, so it's
 * mapped to a deterministic, fake-but-valid address. Never shown in the UI;
 * profiles.email is nulled out right after account creation.
 */
export function usernameToSyntheticEmail(username: string): string {
  return `${username.toLowerCase()}@trainer.gtrain.internal`;
}

/** Turns "smith" into a filesystem-safe username: lowercase, letters/digits only. */
export function slugifyUsername(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** The sign-in field accepts either a real email or a bare username. */
export function resolveSignInIdentifier(input: string): string {
  const trimmed = input.trim();
  return trimmed.includes("@") ? trimmed : usernameToSyntheticEmail(trimmed);
}
