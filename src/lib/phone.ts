/**
 * Canonical form used both for storage and for matching a trainer's invite
 * to the client who eventually signs up with "the same" number, regardless
 * of how either of them typed it (spaces, dashes, +1, parens, ...).
 */
export function normalizePhone(input: string): string {
  const digits = input.replace(/\D/g, "");
  return digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
}

export function formatPhone(digits: string): string {
  if (digits.length !== 10) return digits;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

/**
 * A deterministic, fake-but-valid email used as the Supabase Auth identity
 * for invite-link sign-ups — phone-only accounts still need *some* unique
 * identifier for email+password auth, and we're not paying for SMS
 * verification. Never shown in the UI; profiles.email is nulled out right
 * after account creation.
 */
export function phoneToSyntheticEmail(phone: string): string {
  return `p${phone}@phone.gtrain.internal`;
}
