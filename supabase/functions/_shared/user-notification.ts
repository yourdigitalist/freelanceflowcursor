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

export async function upsertUserNotification(
  supabase: { from: (table: string) => { upsert: (row: unknown, opts: unknown) => Promise<{ error: { message: string } | null }> } },
  row: {
    user_id: string;
    type: string;
    title: string;
    body: string | null;
    link: string | null;
    event_key: string;
  },
): Promise<boolean> {
  const { error } = await supabase.from("notifications").upsert(row, {
    onConflict: "user_id,event_key",
    ignoreDuplicates: true,
  });
  if (error) {
    console.error("notification upsert failed:", error.message, row.event_key);
    return false;
  }
  return true;
}
