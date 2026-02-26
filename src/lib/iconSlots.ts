/**
 * Icon slots: each slot is a place in the app that can show a custom icon.
 * Admin can assign an uploaded icon to any slot; otherwise the default is used.
 * Grouped for the admin UI.
 */
export const ICON_SLOT_GROUPS = [
  {
    group: 'Sidebar',
    slots: [
      { key: 'sidebar_dashboard', label: 'Dashboard' },
      { key: 'sidebar_clients', label: 'Clients' },
      { key: 'sidebar_projects', label: 'Projects' },
      { key: 'sidebar_time', label: 'Time' },
      { key: 'sidebar_invoices', label: 'Invoices' },
      { key: 'sidebar_reviews', label: 'Reviews' },
    ],
  },
  {
    group: 'Dashboard',
    slots: [
      { key: 'stat_clients', label: 'Stat – Clients' },
      { key: 'stat_projects', label: 'Stat – Projects' },
      { key: 'stat_hours', label: 'Stat – Hours' },
      { key: 'stat_money', label: 'Stat – Pending payment' },
      { key: 'empty_projects', label: 'Empty state – Projects' },
      { key: 'empty_invoices', label: 'Empty state – Invoices' },
      { key: 'empty_clients', label: 'Empty state – Clients' },
      { key: 'empty_time', label: 'Empty state – Time' },
      { key: 'empty_reviews', label: 'Empty state – Reviews' },
    ],
  },
  {
    group: 'Admin',
    slots: [
      { key: 'admin_overview', label: 'Overview' },
      { key: 'admin_announcements', label: 'Announcements' },
      { key: 'admin_comms', label: 'Comms & templates' },
      { key: 'admin_branding', label: 'Branding' },
      { key: 'admin_icons', label: 'Icons' },
      { key: 'admin_help_content', label: 'Help content' },
      { key: 'admin_feature_requests', label: 'Feature requests' },
      { key: 'admin_feedback', label: 'Feedback' },
    ],
  },
  {
    group: 'Settings',
    slots: [
      { key: 'settings_profile', label: 'Profile' },
      { key: 'settings_business', label: 'Company' },
      { key: 'settings_locale', label: 'Locale' },
      { key: 'settings_invoices', label: 'Invoices' },
      { key: 'settings_notifications', label: 'Notifications' },
      { key: 'settings_subscription', label: 'Billing' },
      { key: 'settings_storage', label: 'Storage' },
    ],
  },
  {
    group: 'Auth & landing',
    slots: [
      { key: 'app_logo', label: 'App logo (briefcase)' },
      { key: 'auth_clock', label: 'Auth – Time tracking' },
      { key: 'auth_users', label: 'Auth – Clients' },
      { key: 'auth_receipt', label: 'Auth – Invoicing' },
      { key: 'auth_chart', label: 'Auth – Reports' },
      { key: 'auth_check', label: 'Auth – Checkmark' },
      { key: 'onboarding_building', label: 'Onboarding – Company' },
      { key: 'onboarding_user', label: 'Onboarding – User' },
      { key: 'onboarding_receipt', label: 'Onboarding – Invoicing' },
      { key: 'onboarding_table', label: 'Onboarding – Projects' },
      { key: 'onboarding_timer', label: 'Onboarding – Time' },
    ],
  },
  {
    group: 'Tasks & projects',
    slots: [
      { key: 'task_clock', label: 'Task – Time' },
      { key: 'task_message', label: 'Task – Comments' },
      { key: 'task_calendar', label: 'Task – Due date' },
      { key: 'project_clock', label: 'Project header – Time' },
      { key: 'project_dollar', label: 'Project header – Budget' },
      { key: 'project_calendar', label: 'Project header – Calendar' },
      { key: 'project_check', label: 'Project header – Tasks' },
    ],
  },
  {
    group: 'Invoices & reviews',
    slots: [
      { key: 'invoice_receipt', label: 'Invoice list – Receipt' },
      { key: 'invoice_empty', label: 'Invoice empty state' },
      { key: 'review_iris', label: 'Review – Iris/approval' },
    ],
  },
  {
    group: 'Notifications & help',
    slots: [
      { key: 'nav_bell', label: 'Notifications (bell)' },
      { key: 'help_book', label: 'Help – Book' },
    ],
  },
] as const;

/** Flat list of all slot keys and labels (for assignment UI and type) */
export const ICON_SLOTS = ICON_SLOT_GROUPS.flatMap((g) =>
  g.slots.map((s) => ({ key: s.key, label: `${g.group} – ${s.label}` }))
);

export type IconSlotKey = (typeof ICON_SLOT_GROUPS)[number]['slots'][number]['key'];
