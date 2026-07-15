import type { User } from '@supabase/supabase-js';

export function isEmailVerified(user: User | null | undefined): boolean {
  return !!user?.email_confirmed_at;
}

export const EMAIL_VERIFICATION_REQUIRED_MESSAGE =
  'Verify your email before sending to clients. Go to Settings → Profile to resend the verification link.';

export function requireEmailVerified(
  user: User | null | undefined,
): { ok: true } | { ok: false; message: string } {
  if (isEmailVerified(user)) return { ok: true };
  return { ok: false, message: EMAIL_VERIFICATION_REQUIRED_MESSAGE };
}
