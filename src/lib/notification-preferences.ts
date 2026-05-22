/**
 * Shape of notification_preferences stored in profiles (JSONB).
 * Missing keys are treated as "on" (true) when reading.
 */
export interface ChannelPref {
  inApp?: boolean;
  email?: boolean;
}

export interface DuePref {
  dueSoon?: ChannelPref;
  overdue?: ChannelPref;
  daysBefore?: number;
}

export interface NotificationPreferences {
  projects?: DuePref;
  tasks?: DuePref;
  invoices?: {
    dueSoon?: ChannelPref;
    overdue?: ChannelPref;
    sent?: ChannelPref;
    paid?: ChannelPref;
    daysBefore?: number;
  };
  /** Approvals (review requests). Stored as `reviews` for backward compatibility. */
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
  /** Marketing / product updates and tips. Default true at signup; user can unsubscribe in settings or via email link. */
  marketing?: { email?: boolean };
}

const DEFAULT_DAYS = 7;
const CONTRACT_DEFAULT_DAYS = 3;

export function getDefaultPreferences(): NotificationPreferences {
  return {
    projects: { dueSoon: { inApp: true, email: false }, overdue: { inApp: true, email: false }, daysBefore: DEFAULT_DAYS },
    tasks: { dueSoon: { inApp: true, email: false }, overdue: { inApp: true, email: false }, daysBefore: DEFAULT_DAYS },
    invoices: {
      dueSoon: { inApp: true, email: true },
      overdue: { inApp: true, email: true },
      daysBefore: DEFAULT_DAYS,
    },
    reviews: {
      comment: { inApp: true, email: true },
      status: { inApp: true, email: true },
      dueSoon: { inApp: true, email: true },
      overdue: { inApp: true, email: true },
      daysBefore: DEFAULT_DAYS,
    },
    proposals: {
      viewed: { inApp: true, email: true },
      accepted: { inApp: true, email: true },
    },
    contracts: {
      dueSoon: { inApp: true, email: true },
      overdue: { inApp: true, email: true },
      freelancerSigned: { inApp: true, email: false },
      clientSigned: { inApp: true, email: true },
      fullySigned: { inApp: true, email: true },
      cancelled: { inApp: true, email: true },
      daysBefore: CONTRACT_DEFAULT_DAYS,
    },
    marketing: { email: true },
  };
}

export function mergeWithDefaults(prefs: NotificationPreferences | null | undefined): NotificationPreferences {
  const def = getDefaultPreferences();
  if (!prefs || typeof prefs !== 'object') return def;
  const merged: NotificationPreferences = {
    projects: { ...def.projects, ...prefs.projects },
    tasks: { ...def.tasks, ...prefs.tasks },
    invoices: { ...def.invoices, ...prefs.invoices },
    reviews: { ...def.reviews, ...prefs.reviews },
    proposals: { ...def.proposals, ...prefs.proposals },
    contracts: { ...def.contracts, ...prefs.contracts },
    marketing: { ...def.marketing, ...prefs.marketing },
  };
  if (merged.projects?.dueSoon) merged.projects.dueSoon.email = false;
  if (merged.projects?.overdue) merged.projects.overdue.email = false;
  if (merged.tasks?.dueSoon) merged.tasks.dueSoon.email = false;
  if (merged.tasks?.overdue) merged.tasks.overdue.email = false;
  if (merged.marketing?.email === undefined) merged.marketing = { ...merged.marketing, email: true };
  return merged;
}

export function channelEnabled(
  pref: ChannelPref | undefined,
  channel: keyof ChannelPref,
  defaultOn = true,
): boolean {
  const v = pref?.[channel];
  return v === undefined ? defaultOn : !!v;
}
