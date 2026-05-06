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
      { key: 'sidebar_notes', label: 'Notes' },
      { key: 'sidebar_invoices', label: 'Invoices' },
      { key: 'sidebar_proposals', label: 'Proposals' },
      { key: 'sidebar_contracts', label: 'Contracts' },
      { key: 'sidebar_services', label: 'Services' },
      { key: 'sidebar_reviews', label: 'Approvals' },
    ],
  },
  {
    group: 'Timer bar',
    slots: [
      { key: 'timer_bar_clock', label: 'Timer bar – Clock (elapsed)' },
      { key: 'timer_bar_open', label: 'Timer bar – Open Timer link' },
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
      { key: 'empty_reviews', label: 'Empty state – Approvals' },
    ],
  },
  {
    group: 'Admin',
    slots: [
      { key: 'admin_overview', label: 'Overview' },
      { key: 'admin_landing_content', label: 'Landing content' },
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
      { key: 'invoice_stat_total', label: 'Invoice dashboard – Total invoiced' },
      { key: 'invoice_stat_paid', label: 'Invoice dashboard – Paid' },
      { key: 'invoice_stat_pending', label: 'Invoice dashboard – Pending' },
      { key: 'invoice_stat_overdue', label: 'Invoice dashboard – Overdue' },
      { key: 'review_iris', label: 'Review – Iris/approval' },
      { key: 'proposal_about', label: 'Proposal – About' },
      { key: 'proposal_objective', label: 'Proposal – Project Objective' },
      { key: 'proposal_services', label: 'Proposal – Services' },
      { key: 'proposal_duration', label: 'Proposal – Duration' },
      { key: 'proposal_payment', label: 'Proposal – Payment' },
      { key: 'proposal_notes', label: 'Proposal – Notes' },
    ],
  },
  {
    group: 'Approvals',
    slots: [
      { key: 'approval_calendar', label: 'Pick date (calendar)' },
      { key: 'approval_images', label: 'Images upload' },
      { key: 'approval_documents', label: 'Documents upload' },
      { key: 'approval_folder', label: 'Folder' },
      { key: 'approval_client_approve', label: 'Client view – Approve' },
      { key: 'approval_client_reject', label: 'Client view – Reject' },
      { key: 'approval_client_comment', label: 'Client view – Comment' },
    ],
  },
  {
    group: 'User menu & nav',
    slots: [
      { key: 'nav_bell', label: 'Notifications (bell)' },
      { key: 'nav_settings', label: 'Settings (gear)' },
      { key: 'nav_billing', label: 'Billing / Sparkles' },
      { key: 'help_book', label: 'Help Center' },
      { key: 'auth_sign_out', label: 'Sign out' },
    ],
  },
  {
    group: 'Help Center',
    slots: [
      { key: 'help_faqs', label: 'FAQs (info)' },
      { key: 'help_onboarding', label: 'Onboarding (play)' },
      { key: 'help_feature_requests', label: 'Feature requests (lightbulb)' },
      { key: 'help_feedback', label: 'Feedback (message)' },
      { key: 'help_contact', label: 'Contact (envelope)' },
    ],
  },
  {
    group: 'Client card',
    slots: [
      { key: 'client_company', label: 'Company (building)' },
      { key: 'client_email', label: 'Email' },
      { key: 'client_phone', label: 'Phone' },
    ],
  },
  {
    group: 'Actions',
    slots: [
      { key: 'action_edit', label: 'Edit (pencil)' },
      { key: 'action_duplicate', label: 'Duplicate (copy)' },
      { key: 'action_preview', label: 'Preview (eye)' },
      { key: 'action_more', label: 'More options (three dots)' },
      { key: 'action_print', label: 'Print (printer)' },
      { key: 'action_send', label: 'Send / envelope (Send to Client, Send Invoice)' },
      { key: 'action_copy_link', label: 'Copy link' },
      { key: 'action_delete', label: 'Delete (trash)' },
    ],
  },
  {
    group: 'Profile',
    slots: [
      { key: 'profile_camera', label: 'Avatar / Photo (camera)' },
    ],
  },
  {
    group: 'Notes editor',
    slots: [
      { key: 'notes_add_icon', label: 'Add icon (emoji / note)' },
      { key: 'notes_add_cover', label: 'Add cover (image)' },
      { key: 'notes_add_comment', label: 'Add comment' },
    ],
  },
] as const;

/** Flat list of all slot keys and labels (for assignment UI and type) */
export const ICON_SLOTS = ICON_SLOT_GROUPS.flatMap((g) =>
  g.slots.map((s) => ({ key: s.key, label: `${g.group} – ${s.label}` }))
);

export type IconSlotKey = (typeof ICON_SLOT_GROUPS)[number]['slots'][number]['key'];
