/** Keep manually added recipients; replace only the last auto-filled client email. */
export function applyClientEmailToRecipients(
  recipients: string[],
  previousAutoEmail: string | null,
  clientEmail: string | null,
): { recipients: string[]; autoEmail: string | null } {
  const trimmed = clientEmail?.trim() || null;
  const withoutPrevious = previousAutoEmail
    ? recipients.filter((email) => email !== previousAutoEmail)
    : recipients;

  if (!trimmed) {
    return { recipients: withoutPrevious, autoEmail: null };
  }

  if (withoutPrevious.includes(trimmed)) {
    return { recipients: withoutPrevious, autoEmail: trimmed };
  }

  return { recipients: [...withoutPrevious, trimmed], autoEmail: trimmed };
}
