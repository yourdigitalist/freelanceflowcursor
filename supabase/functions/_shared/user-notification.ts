/** In-app + preference helpers for Edge Functions (mirrors src/lib/notification-preferences.ts). */

export type ChannelPref = { inApp?: boolean; email?: boolean };

export type NotificationPreferences = {
  invoices?: {
    dueSoon?: ChannelPref;
    overdue?: ChannelPref;
    sent?: ChannelPref;
    paid?: ChannelPref;
    daysBefore?: number;
  };
  /** Stored as `reviews`; UI label is Approvals */
  reviews?: {
    comment?: ChannelPref;
    status?: ChannelPref;
    dueSoon?: ChannelPref;
    overdue?: ChannelPref;
    daysBefore?: number;
  };
  proposals?: {
    viewed?: ChannelPref;
    accepted?: ChannelPref;
  };
  contracts?: {
    dueSoon?: ChannelPref;
    overdue?: ChannelPref;
    freelancerSigned?: ChannelPref;
    clientSigned?: ChannelPref;
    fullySigned?: ChannelPref;
    cancelled?: ChannelPref;
    daysBefore?: number;
  };
  marketing?: { email?: boolean };
};

export function channelEnabled(
  pref: ChannelPref | undefined,
  channel: keyof ChannelPref,
  defaultOn = true,
): boolean {
  const v = pref?.[channel];
  return v === undefined ? defaultOn : !!v;
}

export function getReviewPrefs(prefs: NotificationPreferences | null | undefined) {
  return prefs?.reviews;
}

export function getProposalPrefs(prefs: NotificationPreferences | null | undefined) {
  return prefs?.proposals;
}

export function getContractPrefs(prefs: NotificationPreferences | null | undefined) {
  return prefs?.contracts;
}

type SupabaseError = { code?: string; message: string };
type InsertClient = {
  from: (table: string) => {
    insert: (row: unknown) => Promise<{ error: SupabaseError | null }>;
    upsert: (row: unknown, opts: unknown) => Promise<{ error: SupabaseError | null }>;
  };
};

function isDuplicateError(error: SupabaseError): boolean {
  return error.code === "23505" || /duplicate key/i.test(error.message);
}

/** Insert in-app notification. Uses insert (not upsert) so PostgREST works without a named UNIQUE constraint. */
export async function upsertUserNotification(
  supabase: InsertClient,
  row: {
    user_id: string;
    type: string;
    title: string;
    body: string | null;
    link: string | null;
    event_key: string;
  },
): Promise<boolean> {
  const { error } = await supabase.from("notifications").insert(row);
  if (!error) return true;
  if (isDuplicateError(error)) return true;
  console.error("notification insert failed:", error.message, row.event_key);
  return false;
}

/** Batch insert for scheduled jobs; skips rows that already exist for the same event_key. */
export async function insertUserNotifications(
  supabase: InsertClient,
  rows: Array<{
    user_id: string;
    type: string;
    title: string;
    body: string | null;
    link: string | null;
    event_key: string;
  }>,
): Promise<number> {
  let inserted = 0;
  for (const row of rows) {
    if (await upsertUserNotification(supabase, row)) inserted += 1;
  }
  return inserted;
}
