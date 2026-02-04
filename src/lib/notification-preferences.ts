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
  reviews?: {
    comment?: ChannelPref;
    status?: ChannelPref;
    dueSoon?: ChannelPref;
    overdue?: ChannelPref;
    daysBefore?: number;
  };
  importExport?: ChannelPref;
}

const DEFAULT_DAYS = 7;

export function getDefaultPreferences(): NotificationPreferences {
  return {
    projects: { dueSoon: { inApp: true, email: true }, overdue: { inApp: true, email: true }, daysBefore: DEFAULT_DAYS },
    tasks: { dueSoon: { inApp: true, email: true }, overdue: { inApp: true, email: true }, daysBefore: DEFAULT_DAYS },
    invoices: {
      dueSoon: { inApp: true, email: true },
      overdue: { inApp: true, email: true },
      sent: { inApp: true, email: true },
      paid: { inApp: true, email: true },
      daysBefore: DEFAULT_DAYS,
    },
    reviews: {
      comment: { inApp: true, email: true },
      status: { inApp: true, email: true },
      dueSoon: { inApp: true, email: true },
      overdue: { inApp: true, email: true },
      daysBefore: DEFAULT_DAYS,
    },
    importExport: { inApp: true, email: true },
  };
}

export function mergeWithDefaults(prefs: NotificationPreferences | null | undefined): NotificationPreferences {
  const def = getDefaultPreferences();
  if (!prefs || typeof prefs !== 'object') return def;
  return {
    projects: { ...def.projects, ...prefs.projects },
    tasks: { ...def.tasks, ...prefs.tasks },
    invoices: { ...def.invoices, ...prefs.invoices },
    reviews: { ...def.reviews, ...prefs.reviews },
    importExport: { ...def.importExport, ...prefs.importExport },
  };
}
