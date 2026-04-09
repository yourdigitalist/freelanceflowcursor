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
    daysBefore?: number;
  };
  reviews?: {
    comment?: ChannelPref;
    status?: ChannelPref;
    dueSoon?: ChannelPref;
    overdue?: ChannelPref;
    daysBefore?: number;
  };
  /** Marketing / product updates and tips. Default true at signup; user can unsubscribe in settings or via email link. */
  marketing?: { email?: boolean };
}

const DEFAULT_DAYS = 7;

export function getDefaultPreferences(): NotificationPreferences {
  return {
    // Email policy: only invoice/review notifications are emailed.
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
    marketing: { ...def.marketing, ...prefs.marketing },
  };
  // Enforce policy in case legacy rows still have email=true.
  if (merged.projects?.dueSoon) merged.projects.dueSoon.email = false;
  if (merged.projects?.overdue) merged.projects.overdue.email = false;
  if (merged.tasks?.dueSoon) merged.tasks.dueSoon.email = false;
  if (merged.tasks?.overdue) merged.tasks.overdue.email = false;
  // Marketing email: default true if not set (opted in at signup)
  if (merged.marketing?.email === undefined) merged.marketing = { ...merged.marketing, email: true };
  return merged;
}
