// @ts-nocheck
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import {
  buildLanceUserEmail,
  escapeHtml,
  getLanceFromAddress,
  getLanceUserFirstName,
  LANCE_EMAIL_LOGO_BLACK_URL,
  LANCE_EMAIL_LOGO_WHITE_URL,
  LANCE_PRODUCT_NAME,
  loadLanceEmailComms,
  sendLanceUserEmail,
} from "./lance-email.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const APP_BASE_URL = (Deno.env.get("APP_BASE_URL") || "https://app.getlance.app").trim().replace(/\/$/, "");
const RESTORE_EMAIL = "hello@getlance.app";
const RESTORE_WINDOW_DAYS = 30;

export const DELETION_CLEAR_FIELDS = {
  deletion_warning_sent: false,
  deletion_warning_sent_at: null,
  scheduled_deletion_at: null,
  deletion_reminder_3d_sent_at: null,
  deletion_reminder_1d_sent_at: null,
  deletion_export_token: null,
};

export type DeletionEmailStage = "initial" | "3d" | "1d";

export function generateDeletionExportToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function buildAccountDeletionUrls(exportToken?: string | null) {
  const billingUrl = `${APP_BASE_URL}/settings/subscription`;
  const exportUrl = exportToken
    ? `${APP_BASE_URL}/export-account-data?token=${encodeURIComponent(exportToken)}`
    : `${APP_BASE_URL}/settings/user`;
  return { billingUrl, exportUrl, restoreEmail: RESTORE_EMAIL };
}

export function buildDeletionWarningCopy(input: {
  stage: DeletionEmailStage;
  name: string;
  deletionDateLabel: string;
  daysLeft: number;
  billingUrl: string;
  exportUrl: string;
}): { subject: string; body: string } {
  const { stage, name, deletionDateLabel, daysLeft, billingUrl, exportUrl } = input;
  const product = LANCE_PRODUCT_NAME;

  if (stage === "initial") {
    return {
      subject: `Action required: your ${product} account will be deleted in 7 days`,
      body: `Hi ${name},

Your free trial ended and we have not received payment details. We will delete your ${product} account and all associated data on ${deletionDateLabel} unless you subscribe.

What you can do now:
• Subscribe to keep your clients, projects, invoices, and contracts: ${billingUrl}
• Export a copy of your data before deletion: ${exportUrl}

We will send two more reminders before deletion. Subscribing cancels the deletion schedule immediately.

Thanks,
The ${product} team`,
    };
  }

  if (stage === "3d") {
    return {
      subject: `Reminder: ${product} account deletion in ${daysLeft} day${daysLeft === 1 ? "" : "s"}`,
      body: `Hi ${name},

This is a reminder that your ${product} account is scheduled for deletion on ${deletionDateLabel} (${daysLeft} day${daysLeft === 1 ? "" : "s"} from now).

Subscribe to keep your account: ${billingUrl}
Export your data: ${exportUrl}

If you take no action, your account will be deactivated on ${deletionDateLabel}. You can contact ${RESTORE_EMAIL} within ${RESTORE_WINDOW_DAYS} days after deactivation to request a restore.

Thanks,
The ${product} team`,
    };
  }

  return {
    subject: `Final notice: ${product} account deletion tomorrow`,
    body: `Hi ${name},

Final reminder: your ${product} account will be deactivated tomorrow (${deletionDateLabel}) unless you subscribe.

Subscribe now: ${billingUrl}
Export your data: ${exportUrl}

After deactivation you have ${RESTORE_WINDOW_DAYS} days to email ${RESTORE_EMAIL} and request a restore. After that, data is permanently removed.

Thanks,
The ${product} team`,
  };
}

export async function sendDeletionWarningEmail(
  supabase: SupabaseClient,
  resend: Resend,
  input: {
    to: string;
    stage: DeletionEmailStage;
    name: string;
    deletionDateLabel: string;
    daysLeft: number;
    exportToken?: string | null;
  },
): Promise<{ ok: boolean; error?: string }> {
  const { billingUrl, exportUrl } = buildAccountDeletionUrls(input.exportToken);
  const { subject, body } = buildDeletionWarningCopy({
    stage: input.stage,
    name: getLanceUserFirstName(input.name),
    deletionDateLabel: input.deletionDateLabel,
    daysLeft: input.daysLeft,
    billingUrl,
    exportUrl,
  });

  const lanceComms = await loadLanceEmailComms(supabase);
  const primaryColor = lanceComms.primaryColor;
  const safeBilling = escapeHtml(billingUrl);
  const safeExport = escapeHtml(exportUrl);
  const safeBody = escapeHtml(body).replace(/\n/g, "<br>");

  const contentHtml = `<h2 style="margin:0 0 12px;font-size:18px;color:${escapeHtml(primaryColor)};">${escapeHtml(subject)}</h2>
<p style="margin:0 0 16px;color:#374151;">${safeBody}</p>
<p style="margin:0 0 8px;">
  <a href="${safeBilling}" style="display:inline-block;background:${escapeHtml(primaryColor)};color:#ffffff !important;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin-right:8px;">Save my account</a>
  <a href="${safeExport}" style="display:inline-block;background:#ffffff;color:${escapeHtml(primaryColor)} !important;padding:11px 23px;border-radius:8px;text-decoration:none;font-weight:600;border:1px solid ${escapeHtml(primaryColor)};">Export my data</a>
</p>`;

  const result = await sendLanceUserEmail(resend, supabase, {
    to: input.to,
    subject,
    text: body,
    contentHtml,
    comms: lanceComms,
    recipientEmail: input.to,
  });

  return result.ok ? { ok: true } : { ok: false, error: result.error };
}

export async function sendAccountSoftDeletedEmail(
  supabase: SupabaseClient,
  resend: Resend,
  input: { email: string; name: string; restoreUntilLabel: string },
): Promise<{ ok: boolean; error?: string }> {
  const name = getLanceUserFirstName(input.name);
  const subject = `Your ${LANCE_PRODUCT_NAME} account has been deactivated`;
  const body = `Hi ${name},

Your ${LANCE_PRODUCT_NAME} account has been deactivated because your trial ended and no subscription was added.

Your data is retained until ${input.restoreUntilLabel}. To restore your account, email ${RESTORE_EMAIL} from this address (${input.email}) and we will reactivate it.

After ${input.restoreUntilLabel}, your data will be permanently deleted.

Thanks,
The ${LANCE_PRODUCT_NAME} team`;

  const lanceComms = await loadLanceEmailComms(supabase);
  const primaryColor = lanceComms.primaryColor;
  const safeBody = escapeHtml(body).replace(/\n/g, "<br>");
  const mailto = escapeHtml(`mailto:${RESTORE_EMAIL}?subject=${encodeURIComponent("Restore my Lance account")}`);
  const contentHtml = `<h2 style="margin:0 0 12px;font-size:18px;color:${escapeHtml(primaryColor)};">${escapeHtml(subject)}</h2>
<p style="margin:0;color:#374151;">${safeBody}</p>
<p style="margin:16px 0 0;"><a href="${mailto}" style="display:inline-block;background:${escapeHtml(primaryColor)};color:#ffffff !important;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">Email to restore</a></p>`;

  const result = await sendLanceUserEmail(resend, supabase, {
    to: input.email,
    subject,
    text: body,
    contentHtml,
    comms: lanceComms,
    recipientEmail: input.email,
  });

  return result.ok ? { ok: true } : { ok: false, error: result.error };
}

const USER_OWNED_TABLES = [
  "clients",
  "projects",
  "project_statuses",
  "tasks",
  "time_entries",
  "invoices",
  "proposals",
  "contracts",
  "contract_templates",
  "services",
  "taxes",
  "notes",
  "note_folders",
  "note_tags",
  "review_requests",
  "review_folders",
  "notifications",
  "client_activities",
  "client_follow_ups",
  "feature_requests",
] as const;

export async function exportUserAccountData(
  adminClient: SupabaseClient,
  userId: string,
): Promise<Record<string, unknown>> {
  const exportedAt = new Date().toISOString();
  const payload: Record<string, unknown> = { exported_at: exportedAt, user_id: userId };

  const { data: profile } = await adminClient.from("profiles").select("*").eq("user_id", userId).maybeSingle();
  payload.profile = profile ?? null;

  for (const table of USER_OWNED_TABLES) {
    const { data, error } = await adminClient.from(table).select("*").eq("user_id", userId);
    if (error) {
      console.warn(`export skip ${table}:`, error.message);
      payload[table] = [];
    } else {
      payload[table] = data ?? [];
    }
  }

  const { data: invoiceItems } = await adminClient
    .from("invoice_items")
    .select("*")
    .in("invoice_id", ((payload.invoices as { id: string }[]) || []).map((row) => row.id));
  payload.invoice_items = invoiceItems ?? [];

  const entryIds = ((payload.time_entries as { id: string }[]) || []).map((row) => row.id);
  if (entryIds.length > 0) {
    const { data: segments } = await adminClient
      .from("time_entry_segments")
      .select("*")
      .in("time_entry_id", entryIds);
    payload.time_entry_segments = segments ?? [];
  } else {
    payload.time_entry_segments = [];
  }

  return payload;
}

export async function softDeleteUserAccount(
  adminClient: SupabaseClient,
  resend: Resend,
  input: {
    userId: string;
    email?: string | null;
    name?: string | null;
    stripeCustomerId?: string | null;
    stripeSubscriptionId?: string | null;
  },
): Promise<{ ok: boolean; error?: string; restoreUntil?: string }> {
  const { userId } = input;
  let recipientEmail = (input.email || "").trim();
  let recipientName = (input.name || "").trim();

  if (!recipientEmail || !recipientName) {
    const { data: profile } = await adminClient
      .from("profiles")
      .select("email, full_name, first_name, last_name")
      .eq("user_id", userId)
      .maybeSingle();
    if (!recipientEmail) recipientEmail = ((profile?.email as string) || "").trim();
    if (!recipientName) {
      const first = ((profile?.first_name as string) || "").trim();
      const last = ((profile?.last_name as string) || "").trim();
      recipientName =
        `${first} ${last}`.trim() ||
        ((profile?.full_name as string) || "").trim() ||
        recipientEmail.split("@")[0] ||
        "there";
    }
  }

  const restoreUntil = new Date(Date.now() + RESTORE_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const now = new Date().toISOString();

  const { error: profileError } = await adminClient
    .from("profiles")
    .update({
      account_soft_deleted_at: now,
      restore_until: restoreUntil,
      ...DELETION_CLEAR_FIELDS,
    })
    .eq("user_id", userId);

  if (profileError) {
    return { ok: false, error: profileError.message };
  }

  const { error: banError } = await adminClient.auth.admin.updateUserById(userId, {
    ban_duration: "876000h",
  });
  if (banError) {
    return { ok: false, error: `Failed to deactivate login: ${banError.message}` };
  }

  if (recipientEmail) {
    const restoreUntilLabel = new Date(restoreUntil).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
    const emailResult = await sendAccountSoftDeletedEmail(adminClient, resend, {
      email: recipientEmail,
      name: recipientName,
      restoreUntilLabel,
    });
    if (!emailResult.ok) {
      return { ok: false, error: emailResult.error || "Failed to send deactivation email" };
    }
  }

  return { ok: true, restoreUntil };
}

export async function restoreSoftDeletedAccount(
  adminClient: SupabaseClient,
  userId: string,
): Promise<{ ok: boolean; error?: string; email?: string }> {
  const { data: profile, error: profileError } = await adminClient
    .from("profiles")
    .select("user_id, email, account_soft_deleted_at, restore_until")
    .eq("user_id", userId)
    .maybeSingle();

  if (profileError || !profile) {
    return { ok: false, error: "Profile not found" };
  }
  if (!profile.account_soft_deleted_at) {
    return { ok: false, error: "Account is not deactivated" };
  }
  if (!profile.restore_until || new Date(profile.restore_until) <= new Date()) {
    return { ok: false, error: "Restore window has expired" };
  }

  const { error: unbanError } = await adminClient.auth.admin.updateUserById(userId, {
    ban_duration: "none",
  });
  if (unbanError) {
    return { ok: false, error: `Failed to restore login: ${unbanError.message}` };
  }

  const { error: updateError } = await adminClient
    .from("profiles")
    .update({
      account_soft_deleted_at: null,
      restore_until: null,
      ...DELETION_CLEAR_FIELDS,
    })
    .eq("user_id", userId);

  if (updateError) {
    return { ok: false, error: updateError.message };
  }

  return { ok: true, email: (profile.email as string) || undefined };
}
