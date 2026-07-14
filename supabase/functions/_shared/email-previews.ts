// @ts-nocheck
/** Build HTML previews for all transactional emails (admin catalog). */
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import {
  buildAnnouncementEmail,
  buildLanceUserEmail,
  buildTrialReminderEmail,
  escapeHtml,
  getLanceFromAddress,
  getLanceSignature,
  getLanceUserFirstName,
  LANCE_EMAIL_LOGO_BLACK_URL,
  LANCE_EMAIL_LOGO_WHITE_URL,
  LANCE_PRODUCT_NAME,
  loadLanceEmailComms,
  plainTextToLanceContentHtml,
  replaceTokens,
  type LanceEmailComms,
} from "./lance-email.ts";
import {
  getDefaultClientFooter,
  getDefaultClientHeader,
  normalizeLogoUrl,
  parseEmailCommsConfig,
} from "./client-email-comms.ts";
import {
  LANCE_AUTH_PRIMARY_COLOR,
  LANCE_EMAIL_FONT_FAMILY,
  normalizeAuthEmailHtml,
} from "./email-styles.ts";
import {
  buildAccountDeletionUrls,
  buildDeletionWarningCopy,
  type DeletionEmailStage,
} from "./account-deletion.ts";

function buildDeletionWarningPreview(
  lanceComms: LanceEmailComms,
  input: {
    stage: DeletionEmailStage;
    userName: string;
    deletionDateLabel: string;
    daysLeft: number;
  },
  userEmail: string,
): { subject: string; html: string } {
  const { billingUrl, exportUrl } = buildAccountDeletionUrls("preview-export-token");
  const { subject, body } = buildDeletionWarningCopy({
    stage: input.stage,
    name: input.userName,
    deletionDateLabel: input.deletionDateLabel,
    daysLeft: input.daysLeft,
    billingUrl,
    exportUrl,
  });
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
  return {
    subject,
    html: buildLanceUserEmail(lanceComms, contentHtml, {}, userEmail),
  };
}


const APP_BASE_URL = (Deno.env.get("APP_BASE_URL") || "https://www.getlance.app").trim().replace(/\/$/, "");

export type EmailPreviewCategory = "auth" | "lance_to_user" | "user_to_client" | "internal";

export type EmailPreviewTemplate = {
  id: string;
  name: string;
  category: EmailPreviewCategory;
  from: string;
  to: string;
  trigger: string;
  subject: string;
  html: string;
  note?: string;
};

export type PreviewProfile = {
  full_name?: string | null;
  email?: string | null;
  business_name?: string | null;
  business_email?: string | null;
  business_logo?: string | null;
  client_email_primary_color?: string | null;
  client_email_header_html?: string | null;
  client_email_footer_html?: string | null;
  currency?: string | null;
  currency_display?: string | null;
  number_format?: string | null;
};

export type AppCommsRow = {
  trial_body_5d?: string | null;
  trial_body_1d?: string | null;
  trial_body_0d?: string | null;
  announcement_default_body?: string | null;
  announcement_custom_html?: string | null;
  account_deleted_subject?: string | null;
  account_deleted_body?: string | null;
  invoice_email_subject_default?: string | null;
  invoice_email_message_default?: string | null;
  reminder_subject_default?: string | null;
  reminder_body_default?: string | null;
};

type AuthConfig = {
  mailer_subjects_confirmation?: string;
  mailer_templates_confirmation_content?: string;
  mailer_subjects_magic_link?: string;
  mailer_templates_magic_link_content?: string;
  mailer_subjects_recovery?: string;
  mailer_templates_recovery_content?: string;
};

function formatMoney(amount: number, currency = "USD"): string {
  return `${(currency || "USD").toUpperCase()} ${Number(amount || 0).toFixed(2)}`;
}

function buildClientBrandedEmail(
  profile: PreviewProfile,
  coreHtml: string,
  supabaseUrl: string,
  extraTokens: Record<string, string> = {},
): string {
  const primaryColor = (profile.client_email_primary_color || "#9B63E9").trim();
  const fromDisplayName = (profile.business_name || profile.full_name || "Your Business").trim();
  const replyToEmail = (profile.business_email || profile.email || "").trim();
  const logoUrl = normalizeLogoUrl(profile.business_logo || "", supabaseUrl);
  const commsConfig = parseEmailCommsConfig(profile.client_email_header_html);
  const selectedRawLogo =
    commsConfig.logoVariant === "dark"
      ? commsConfig.logoDark || profile.business_logo || commsConfig.logoLight || ""
      : profile.business_logo || commsConfig.logoLight || commsConfig.logoDark || "";
  const selectedLogoUrl = normalizeLogoUrl(selectedRawLogo, supabaseUrl);
  const tokens: Record<string, string> = {
    business_name: escapeHtml(fromDisplayName),
    logo_url: selectedLogoUrl || logoUrl,
    primary_color: primaryColor,
    body_html: coreHtml,
    ...extraTokens,
  };
  const header = getDefaultClientHeader(selectedLogoUrl || logoUrl, fromDisplayName, primaryColor);
  const footerTpl = (profile.client_email_footer_html || "").trim();
  const footer = footerTpl ? replaceTokens(footerTpl, tokens) : getDefaultClientFooter(primaryColor, fromDisplayName, replyToEmail);
  return `${header}${coreHtml}${footer}${getLanceSignature(primaryColor)}`;
}

function lanceDeadlinePreview(
  lanceComms: LanceEmailComms,
  userName: string,
  userEmail: string,
  subject: string,
  text: string,
): { subject: string; html: string } {
  const contentHtml = plainTextToLanceContentHtml(text, subject, lanceComms.primaryColor);
  return {
    subject,
    html: buildLanceUserEmail(lanceComms, contentHtml, {}, userEmail),
  };
}

function previewAuthHtml(html: string, email: string): string {
  const siteUrl = APP_BASE_URL;
  const sampleUrl = `${siteUrl}/auth/confirm?token=sample-preview-token`;
  const withTokens = html
    .replace(/\{\{\s*\.ConfirmationURL\s*\}\}/g, sampleUrl)
    .replace(/\{\{\s*\.Token\s*\}\}/g, "sample-preview-token")
    .replace(/\{\{\s*\.TokenHash\s*\}\}/g, "sample-preview-token")
    .replace(/\{\{\s*\.SiteURL\s*\}\}/g, siteUrl)
    .replace(/\{\{\s*\.Email\s*\}\}/g, escapeHtml(email))
    .replace(/\{\{\s*\.RedirectTo\s*\}\}/g, siteUrl);
  return normalizeAuthEmailHtml(withTokens);
}

export function getProjectRef(): string {
  const explicit = (Deno.env.get("SUPABASE_PROJECT_REF") || "").trim();
  if (explicit) return explicit;
  const url = Deno.env.get("SUPABASE_URL") || "";
  const match = url.match(/https:\/\/([^.]+)\.supabase\.co/);
  return match?.[1] || "";
}

export async function fetchAuthEmailConfig(): Promise<{ config: AuthConfig | null; error?: string }> {
  const accessToken = (Deno.env.get("LANCE_MANAGEMENT_ACCESS_TOKEN") || "").trim();
  const projectRef = getProjectRef();
  if (!accessToken) {
    return { config: null, error: "LANCE_MANAGEMENT_ACCESS_TOKEN is not configured on the edge function." };
  }
  if (!projectRef) {
    return { config: null, error: "Could not determine Supabase project ref." };
  }
  try {
    const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/config/auth`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
      const body = await res.text();
      return { config: null, error: `Auth config fetch failed (${res.status}): ${body.slice(0, 200)}` };
    }
    const config = (await res.json()) as AuthConfig;
    return { config };
  } catch (err) {
    return { config: null, error: err instanceof Error ? err.message : "Auth config fetch failed" };
  }
}

export async function buildAllEmailPreviews(
  supabase: SupabaseClient,
  profile: PreviewProfile,
  commsRow: AppCommsRow | null,
  authConfig: AuthConfig | null,
): Promise<EmailPreviewTemplate[]> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const lanceComms = await loadLanceEmailComms(supabase);
  const primaryColor = lanceComms.primaryColor;
  const firstName = getLanceUserFirstName(profile.full_name);
  const userName = firstName;
  const userEmail = (profile.email || "you@example.com").trim();
  const businessName = (profile.business_name || profile.full_name || "Your Business").trim();
  const clientName = "Acme Design Co.";
  const clientEmail = "client@example.com";
  const invoiceNumber = "INV-2026-0042";
  const proposalId = "PROP-2026-0018";
  const contractId = "CNT-2026-0007";
  const reviewTitle = "Homepage redesign";
  const reviewVersion = "3";
  const projectName = "Website refresh";
  const dueDateYmd = "2026-06-15";
  const dueDateLabel = "June 15, 2026";
  const totalFormatted = formatMoney(4500, profile.currency || "USD");
  const otpCode = "482916";
  const billingUrl = `${APP_BASE_URL}/settings/subscription`;
  const supportUrl = `${APP_BASE_URL}/help`;
  const resendFrom = (Deno.env.get("RESEND_FROM_EMAIL") || "onboarding@resend.dev").trim();
  const lanceFrom = getLanceFromAddress(resendFrom);
  const clientFrom = `${businessName} <${resendFrom}>`;

  const templates: EmailPreviewTemplate[] = [];

  // —— Auth (Supabase) ——
  if (authConfig?.mailer_templates_confirmation_content) {
    templates.push({
      id: "auth-confirm-signup",
      name: "Confirm signup",
      category: "auth",
      from: "Supabase Auth",
      to: userEmail,
      trigger: "User signs up with email/password",
      subject: authConfig.mailer_subjects_confirmation || `Confirm your email for ${LANCE_PRODUCT_NAME}`,
      html: previewAuthHtml(authConfig.mailer_templates_confirmation_content, userEmail),
    });
  }
  if (authConfig?.mailer_templates_magic_link_content) {
    templates.push({
      id: "auth-magic-link",
      name: "Magic link sign-in",
      category: "auth",
      from: "Supabase Auth",
      to: userEmail,
      trigger: "User requests a magic link",
      subject: authConfig.mailer_subjects_magic_link || `Your ${LANCE_PRODUCT_NAME} sign-in link`,
      html: previewAuthHtml(authConfig.mailer_templates_magic_link_content, userEmail),
    });
  }
  if (authConfig?.mailer_templates_recovery_content) {
    templates.push({
      id: "auth-recovery",
      name: "Password reset",
      category: "auth",
      from: "Supabase Auth",
      to: userEmail,
      trigger: "User requests password reset",
      subject: authConfig.mailer_subjects_recovery || `Reset your ${LANCE_PRODUCT_NAME} password`,
      html: previewAuthHtml(authConfig.mailer_templates_recovery_content, userEmail),
    });
  }

  // —— Lance → User ——
  for (const daysLeft of [3, 1, 0] as const) {
    const trialEmail = buildTrialReminderEmail(daysLeft, profile.full_name, billingUrl, primaryColor);
    templates.push({
      id: daysLeft === 3 ? "lance-trial-3d" : daysLeft === 1 ? "lance-trial-1d" : "lance-trial-0d",
      name: `Trial reminder (${daysLeft === 3 ? "3 days left" : daysLeft === 1 ? "1 day left" : "ends today"})`,
      category: "lance_to_user",
      from: lanceFrom,
      to: userEmail,
      trigger: "Cron: send-trial-reminders",
      subject: trialEmail.subject,
      html: buildLanceUserEmail(lanceComms, trialEmail.contentHtml, {}, userEmail),
    });
  }

  const accountDeletedSubject =
    ((commsRow?.account_deleted_subject as string | null) || "").trim() ||
    `Your ${LANCE_PRODUCT_NAME} account has been deleted`;
  const accountDeletedFallback = `Hi ${userName},\n\nYour ${LANCE_PRODUCT_NAME} account has been deleted as requested. Your data has been removed from our systems.\n\nYou will not be charged — if you had not completed checkout, no payment method was on file.\n\nIf you did not request this deletion, please contact us: ${supportUrl}\n\nThanks,\nThe ${LANCE_PRODUCT_NAME} team`;
  const accountDeletedBody = (commsRow?.account_deleted_body || "").trim()
    ? replaceTokens(commsRow.account_deleted_body, { user_name: userName, support_url: supportUrl })
    : accountDeletedFallback;
  const safeDeletedBody = escapeHtml(accountDeletedBody).replace(/\n/g, "<br>");
  templates.push({
    id: "lance-account-deleted",
    name: "Account deleted confirmation",
    category: "lance_to_user",
    from: lanceFrom,
    to: userEmail,
    trigger: "Account deletion completed",
    subject: accountDeletedSubject,
    html: buildLanceUserEmail(
      lanceComms,
      `<h2 style="margin:0 0 12px;font-size:18px;color:${escapeHtml(primaryColor)};">${escapeHtml(accountDeletedSubject)}</h2><p style="margin:0;color:#374151;">${safeDeletedBody}</p>
<p style="margin:16px 0 0;"><a href="${escapeHtml(supportUrl)}" style="display:inline-block;background:${escapeHtml(primaryColor)};color:#ffffff !important;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">Help center</a></p>`,
      {},
      userEmail,
    ),
  });

  const deletionDate = dueDateLabel;
  const deletionStages: {
    id: string;
    stage: DeletionEmailStage;
    name: string;
    trigger: string;
    daysLeft: number;
  }[] = [
    {
      id: "lance-inactive-deletion-initial",
      stage: "initial",
      name: "Inactive account deletion (7 days notice)",
      trigger: "Cron: cleanup-inactive-accounts (initial warning)",
      daysLeft: 7,
    },
    {
      id: "lance-inactive-deletion-3d",
      stage: "3d",
      name: "Inactive account deletion (3 days left)",
      trigger: "Cron: cleanup-inactive-accounts (3-day reminder)",
      daysLeft: 3,
    },
    {
      id: "lance-inactive-deletion-1d",
      stage: "1d",
      name: "Inactive account deletion (final notice)",
      trigger: "Cron: cleanup-inactive-accounts (1-day reminder)",
      daysLeft: 1,
    },
  ];

  for (const item of deletionStages) {
    const preview = buildDeletionWarningPreview(
      lanceComms,
      {
        stage: item.stage,
        userName,
        deletionDateLabel: deletionDate,
        daysLeft: item.daysLeft,
      },
      userEmail,
    );
    templates.push({
      id: item.id,
      name: item.name,
      category: "lance_to_user",
      from: lanceFrom,
      to: userEmail,
      trigger: item.trigger,
      subject: preview.subject,
      html: preview.html,
    });
  }

  const softDeletedSubject = `Your ${LANCE_PRODUCT_NAME} account has been deactivated`;
  const restoreUntilLabel = "July 15, 2026";
  const softDeletedBody = `Hi ${userName},

Your ${LANCE_PRODUCT_NAME} account has been deactivated because your trial ended and no subscription was added.

Your data is retained until ${restoreUntilLabel}. To restore your account, email hello@getlance.app from this address (${userEmail}) and we will reactivate it.

After ${restoreUntilLabel}, your data will be permanently deleted.

Thanks,
The ${LANCE_PRODUCT_NAME} team`;
  const safeSoftDeletedBody = escapeHtml(softDeletedBody).replace(/\n/g, "<br>");
  const restoreMailto = escapeHtml(`mailto:hello@getlance.app?subject=${encodeURIComponent("Restore my Lance account")}`);
  templates.push({
    id: "lance-account-soft-deleted",
    name: "Account deactivated (restore window)",
    category: "lance_to_user",
    from: lanceFrom,
    to: userEmail,
    trigger: "Cron: cleanup-inactive-accounts (after scheduled deletion date)",
    subject: softDeletedSubject,
    html: buildLanceUserEmail(
      lanceComms,
      `<h2 style="margin:0 0 12px;font-size:18px;color:${escapeHtml(primaryColor)};">${escapeHtml(softDeletedSubject)}</h2><p style="margin:0;color:#374151;">${safeSoftDeletedBody}</p>
<p style="margin:16px 0 0;"><a href="${restoreMailto}" style="display:inline-block;background:${escapeHtml(primaryColor)};color:#ffffff !important;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">Email to restore</a></p>`,
      {},
      userEmail,
    ),
  });

  const announcementTitle = "New feature: Time reports";
  const announcementBodySource =
    "You can now export time tracked on projects as a PDF report — handy for client updates or your own records.";
  const announcementLink = `${APP_BASE_URL}/dashboard`;
  const announcementEmail = buildAnnouncementEmail({
    title: announcementTitle,
    body: announcementBodySource,
    fullName: profile.full_name,
    link: announcementLink,
    ctaLabel: "Learn more",
    primaryColor,
  });
  const customAnnouncementTpl = (commsRow?.announcement_custom_html || "").trim();
  templates.push({
    id: "lance-announcement",
    name: "Admin announcement",
    category: "lance_to_user",
    from: lanceFrom,
    to: userEmail,
    trigger: "Admin sends announcement",
    subject: announcementEmail.subject,
    html: customAnnouncementTpl
      ? replaceTokens(customAnnouncementTpl, {
        user_name: escapeHtml(firstName),
        title: escapeHtml(announcementTitle),
        body_html: announcementEmail.contentHtml,
        announcement_body: escapeHtml(announcementBodySource).replace(/\n/g, "<br>"),
        link: escapeHtml(announcementLink),
        primary_color: primaryColor,
      })
      : buildLanceUserEmail(lanceComms, announcementEmail.contentHtml, {}, userEmail),
    note: customAnnouncementTpl ? "Using custom announcement HTML from app_comms_defaults." : undefined,
  });

  const deadlineEmails: { id: string; name: string; subject: string; text: string }[] = [
    {
      id: "lance-invoice-due-soon",
      name: "Invoice due soon",
      subject: "Invoice due soon",
      text: `Hi ${userName},\n\nInvoice ${invoiceNumber} is due in 3 days.\n\nOpen invoices: ${APP_BASE_URL}/invoices`,
    },
    {
      id: "lance-invoice-overdue",
      name: "Invoice overdue",
      subject: "Invoice overdue",
      text: `Hi ${userName},\n\nInvoice ${invoiceNumber} is overdue.\n\nOpen invoices: ${APP_BASE_URL}/invoices`,
    },
    {
      id: "lance-approval-due-soon",
      name: "Approval due soon",
      subject: "Approval due soon",
      text: `Hi ${userName},\n\n${reviewTitle} is due in 3 days.\n\nOpen approvals: ${APP_BASE_URL}/reviews/sample-id`,
    },
    {
      id: "lance-approval-overdue",
      name: "Approval overdue",
      subject: "Approval overdue",
      text: `Hi ${userName},\n\n${reviewTitle} is overdue.\n\nOpen approvals: ${APP_BASE_URL}/reviews/sample-id`,
    },
    {
      id: "lance-contract-due-soon",
      name: "Contract due soon",
      subject: "Contract due soon",
      text: `Hi ${userName},\n\nContract ${contractId} is due in 3 days.\n\nOpen contracts: ${APP_BASE_URL}/contracts`,
    },
    {
      id: "lance-contract-overdue",
      name: "Contract overdue",
      subject: "Contract overdue",
      text: `Hi ${userName},\n\nContract ${contractId} is overdue.\n\nOpen contracts: ${APP_BASE_URL}/contracts`,
    },
  ];
  for (const d of deadlineEmails) {
    const preview = lanceDeadlinePreview(lanceComms, userName, userEmail, d.subject, d.text);
    templates.push({
      id: d.id,
      name: d.name,
      category: "lance_to_user",
      from: lanceFrom,
      to: userEmail,
      trigger: "Cron: send-deadline-notifications",
      subject: preview.subject,
      html: preview.html,
    });
  }

  const proposalUrl = `${APP_BASE_URL}/proposals/sample-id`;
  const safeProposalId = escapeHtml(proposalId);
  const safeProposalUrl = escapeHtml(proposalUrl);
  templates.push({
    id: "lance-proposal-viewed",
    name: "Proposal viewed by client",
    category: "lance_to_user",
    from: lanceFrom,
    to: userEmail,
    trigger: "Client opens proposal for the first time",
    subject: `Proposal viewed: ${proposalId}`,
    html: buildLanceUserEmail(
      lanceComms,
      `<h2 style="margin:0 0 12px;font-size:18px;color:${escapeHtml(primaryColor)};">Proposal viewed by client</h2>
<p style="color:#374151;margin:0 0 20px;">Your proposal <strong>${safeProposalId}</strong> was opened by the client.</p>
<p style="margin:0;"><a href="${safeProposalUrl}" style="display:inline-block;background:${escapeHtml(primaryColor)};color:#ffffff !important;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">View proposal</a></p>`,
      {},
      userEmail,
    ),
  });
  templates.push({
    id: "lance-proposal-accepted",
    name: "Proposal accepted",
    category: "lance_to_user",
    from: lanceFrom,
    to: userEmail,
    trigger: "Client accepts proposal",
    subject: `Proposal accepted: ${proposalId}`,
    html: buildLanceUserEmail(
      lanceComms,
      `<h2 style="margin:0 0 12px;font-size:18px;color:${escapeHtml(primaryColor)};">Proposal accepted</h2>
<p style="color:#374151;margin:0 0 20px;">Great news! Your proposal <strong>${safeProposalId}</strong> was accepted by the client.</p>
<p style="margin:0;"><a href="${safeProposalUrl}" style="display:inline-block;background:${escapeHtml(primaryColor)};color:#ffffff !important;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">View proposal</a></p>`,
      {},
      userEmail,
    ),
  });

  const reviewUrl = `${APP_BASE_URL}/reviews/sample-id`;
  const commenterName = clientName;
  templates.push({
    id: "lance-approval-comment",
    name: "New approval comment",
    category: "lance_to_user",
    from: lanceFrom,
    to: userEmail,
    trigger: "Client leaves a comment on an approval request",
    subject: "New approval comment",
    html: buildLanceUserEmail(
      lanceComms,
      `<h2 style="margin:0 0 12px;font-size:18px;color:${escapeHtml(primaryColor)};">New approval comment</h2>
<p style="margin:0 0 8px;color:#374151;">Hi ${escapeHtml(firstName)},</p>
<p style="margin:0 0 20px;color:#374151;">${escapeHtml(commenterName)} left a comment on ${escapeHtml(reviewTitle)}.</p>
<p style="margin:0;"><a href="${escapeHtml(reviewUrl)}" style="display:inline-block;background:${escapeHtml(primaryColor)};color:#ffffff !important;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">View approval</a></p>`,
      {},
      userEmail,
    ),
  });
  for (const status of ["approved", "rejected"] as const) {
    const title = status === "approved" ? "Approval approved" : "Approval rejected";
    const messageBody =
      status === "approved" ? "A client approved your approval request." : "A client rejected your approval request.";
    templates.push({
      id: `lance-approval-${status}`,
      name: title,
      category: "lance_to_user",
      from: lanceFrom,
      to: userEmail,
      trigger: `Client ${status} an approval request`,
      subject: title,
      html: buildLanceUserEmail(
        lanceComms,
        `<h2 style="margin:0 0 12px;font-size:18px;color:${escapeHtml(primaryColor)};">${escapeHtml(title)}</h2>
<p style="margin:0 0 8px;color:#374151;">Hi ${escapeHtml(firstName)},</p>
<p style="margin:0 0 20px;color:#374151;">${escapeHtml(messageBody)}</p>
<p style="margin:0;"><a href="${escapeHtml(reviewUrl)}" style="display:inline-block;background:${escapeHtml(primaryColor)};color:#ffffff !important;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">Open approvals</a></p>`,
        {},
        userEmail,
      ),
    });
  }

  const contractOpenUrl = `${APP_BASE_URL}/contracts/sample-id`;
  templates.push({
    id: "lance-contract-client-signed",
    name: "Client signed contract",
    category: "lance_to_user",
    from: lanceFrom,
    to: userEmail,
    trigger: "Client completes their contract signature",
    subject: `Client signed: ${contractId}`,
    html: buildLanceUserEmail(
      lanceComms,
      `<h2 style="margin:0 0 12px;font-size:18px;color:${escapeHtml(primaryColor)};">Client signed: ${escapeHtml(contractId)}</h2>
<p style="margin:0 0 20px;color:#374151;">Contract ${escapeHtml(contractId)} was signed by the client.</p>
<p style="margin:0;"><a href="${escapeHtml(contractOpenUrl)}" style="display:inline-block;background:${escapeHtml(primaryColor)};color:#ffffff !important;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">Open contract</a></p>`,
      {},
      userEmail,
    ),
  });

  for (const signerType of ["client", "freelancer"] as const) {
    const safeSigner = escapeHtml(signerType);
    templates.push({
      id: `lance-contract-otp-${signerType}`,
      name: `Contract signing OTP (${signerType})`,
      category: "lance_to_user",
      from: lanceFrom,
      to: signerType === "client" ? clientEmail : userEmail,
      trigger: "Signer requests verification code to sign contract",
      subject: `Your ${signerType} signing code for contract ${contractId}`,
      html: buildLanceUserEmail(
        lanceComms,
        `<h2 style="margin:0 0 12px;font-size:18px;color:${escapeHtml(primaryColor)};">Contract verification code</h2>
<p style="margin:0 0 16px;color:#374151;">Use the code below to sign contract <strong>${escapeHtml(contractId)}</strong> as ${safeSigner}. This code expires in 10 minutes.</p>
<div style="font-size:36px;font-weight:700;letter-spacing:8px;color:#111827;margin:18px 0;">${otpCode}</div>
<p style="margin:0;font-size:13px;color:#6b7280;">If you did not request this code, you can ignore this email.</p>`,
        {},
        signerType === "client" ? clientEmail : userEmail,
      ),
      note: "Sent from Get Lance (not user-branded), to freelancer or client signer.",
    });
  }

  // —— User → Client ——
  const primaryColorClient = (profile.client_email_primary_color || "#9B63E9").trim();
  const defaultInvoiceMessage =
    (commsRow?.invoice_email_message_default || "Please find your invoice attached.").trim();
  const invoiceMergeTokens = {
    client_name: clientName,
    invoice_number: invoiceNumber,
    due_date: dueDateYmd,
    total: totalFormatted,
    business_name: businessName,
    project_name: projectName,
  };
  const resolvedInvoiceMessage = replaceTokens(defaultInvoiceMessage, invoiceMergeTokens);
  const safeInvoiceMessage = escapeHtml(resolvedInvoiceMessage);
  const invoiceCoreHtml = `
        <h2 style="color: ${primaryColorClient}; margin-top: 0;">Invoice ${escapeHtml(invoiceNumber)}</h2>
        <div style="color: #333; white-space: pre-wrap;">${safeInvoiceMessage}</div>`;
  const defaultInvoiceSubject =
    (commsRow?.invoice_email_subject_default || `Invoice {{invoice_number}} from {{business_name}}`).trim();
  const invoiceSubject = replaceTokens(defaultInvoiceSubject, invoiceMergeTokens);
  templates.push({
    id: "client-invoice",
    name: "Send invoice",
    category: "user_to_client",
    from: clientFrom,
    to: clientEmail,
    trigger: "User sends invoice from app",
    subject: invoiceSubject,
    html: buildClientBrandedEmail(profile, invoiceCoreHtml, supabaseUrl, {
      invoice_number: escapeHtml(invoiceNumber),
    }),
    note: "PDF attachment not shown in preview.",
  });

  const defaultReminderSubject =
    (commsRow?.reminder_subject_default || "Reminder: Invoice {{invoice_number}} Due Soon").trim();
  const defaultReminderBody =
    (commsRow?.reminder_body_default ||
      "Hi {{client_name}}, this is a reminder that invoice {{invoice_number}} is due on {{due_date}}.").trim();
  const resolvedReminderMessage = replaceTokens(defaultReminderBody, invoiceMergeTokens);
  const reminderSubject = replaceTokens(defaultReminderSubject, invoiceMergeTokens);
  const reminderCoreHtml = `
        <h2 style="color: ${primaryColorClient}; margin-top: 0;">Invoice ${escapeHtml(invoiceNumber)}</h2>
        <div style="color: #333; white-space: pre-wrap;">${escapeHtml(resolvedReminderMessage)}</div>`;
  templates.push({
    id: "client-invoice-reminder",
    name: "Invoice reminder",
    category: "user_to_client",
    from: clientFrom,
    to: clientEmail,
    trigger: "User sends manual invoice reminder (send-invoice)",
    subject: reminderSubject,
    html: buildClientBrandedEmail(profile, reminderCoreHtml, supabaseUrl, {
      invoice_number: escapeHtml(invoiceNumber),
    }),
    note: "Same HTML layout as send invoice; uses reminder subject/body defaults. PDF attached when sent.",
  });

  templates.push({
    id: "client-invoice-receipt",
    name: "Invoice receipt (paid)",
    category: "user_to_client",
    from: clientFrom,
    to: clientEmail,
    trigger: "User sends receipt after invoice is paid",
    subject: `Receipt from ${businessName} for Invoice ${invoiceNumber}`,
    html: buildClientBrandedEmail(
      profile,
      `<h2 style="color: #10B981; margin-top: 0;">Receipt – Invoice ${escapeHtml(invoiceNumber)}</h2>
        ${safeInvoiceMessage ? `<div style="color: #333; white-space: pre-wrap;">${safeInvoiceMessage}</div>` : '<p style="color: #666;">This invoice has been paid.</p>'}`,
      supabaseUrl,
      { invoice_number: escapeHtml(invoiceNumber) },
    ),
    note: "PDF attachment not shown in preview.",
  });

  const proposalPublicUrl = `${APP_BASE_URL}/proposal/sample-token`;
  const proposalMergeTokens = {
    client_name: clientName,
    proposal_id: proposalId,
    total: totalFormatted,
    expires_at: dueDateYmd,
    business_name: businessName,
    project_name: projectName,
  };
  const proposalMessage = replaceTokens(
    `Hi ${clientName}, your proposal is ready for review.`,
    proposalMergeTokens,
  );
  const proposalSubject = `Proposal ${proposalId} from ${businessName}`;
  const proposalCoreHtml = `
      <h2 style="color: ${primaryColorClient}; margin-top: 0;">Proposal ${escapeHtml(proposalId)}</h2>
      <div style="color: #333; white-space: pre-wrap; margin-bottom: 16px;">${escapeHtml(proposalMessage)}</div>
      <p style="margin: 24px 0;">
        <a href="${escapeHtml(proposalPublicUrl)}" style="display: inline-block; background: ${primaryColorClient}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px;">Open proposal</a>
      </p>
      <p style="color: #999; font-size: 12px;">Or copy this link: ${escapeHtml(proposalPublicUrl)}</p>`;
  templates.push({
    id: "client-proposal",
    name: "Send proposal",
    category: "user_to_client",
    from: clientFrom,
    to: clientEmail,
    trigger: "User sends proposal to client",
    subject: proposalSubject,
    html: buildClientBrandedEmail(profile, proposalCoreHtml, supabaseUrl, {
      proposal_id: escapeHtml(proposalId),
      proposal_url: escapeHtml(proposalPublicUrl),
    }),
  });

  const reviewPublicUrl = `${APP_BASE_URL}/review/sample-token`;
  const reviewCoreHtml = `
        <h2 style="color: ${primaryColorClient}; margin-top: 0;">Review request: ${escapeHtml(reviewTitle)}</h2>
        <p style="color: #333;">You've been asked to review <strong>${escapeHtml(reviewTitle)}</strong> (v${escapeHtml(reviewVersion)}).</p>
        <p style="color: #666;">Please review by <strong>${dueDateLabel}</strong>.</p>
        <p style="margin: 24px 0;">
          <a href="${escapeHtml(reviewPublicUrl)}" style="display: inline-block; background: ${primaryColorClient}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px;">Open review</a>
        </p>
        <p style="color: #999; font-size: 12px;">Or copy this link: ${escapeHtml(reviewPublicUrl)}</p>`;
  templates.push({
    id: "client-approval-request",
    name: "Send approval request",
    category: "user_to_client",
    from: clientFrom,
    to: clientEmail,
    trigger: "User sends approval/review request",
    subject: `Review request from ${businessName}: ${reviewTitle} (v${reviewVersion})`,
    html: buildClientBrandedEmail(profile, reviewCoreHtml, supabaseUrl, {
      review_title: escapeHtml(reviewTitle),
      review_url: escapeHtml(reviewPublicUrl),
    }),
  });

  const portalUrl = `${APP_BASE_URL}/portal/sample-token`;
  const portalCoreHtml = `
      <h2 style="color: ${primaryColorClient}; margin-top: 0;">Your portal is ready</h2>
      <p style="color: #333;">Hi ${escapeHtml(clientName)}, your portal is ready. ${escapeHtml(businessName)} has set up a dedicated space for you — open it to get started.</p>
      <p style="margin: 24px 0;">
        <a href="${escapeHtml(portalUrl)}" style="display: inline-block; background: ${primaryColorClient}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px;">Open client portal</a>
      </p>
      <p style="color: #999; font-size: 12px;">Or copy this link: ${escapeHtml(portalUrl)}</p>`;
  templates.push({
    id: "client-portal-link",
    name: "Client portal link",
    category: "user_to_client",
    from: clientFrom,
    to: clientEmail,
    trigger: "User sends client portal invite",
    subject: `Your client portal from ${businessName}`,
    html: buildClientBrandedEmail(profile, portalCoreHtml, supabaseUrl, {
      portal_url: escapeHtml(portalUrl),
      client_name: escapeHtml(clientName),
    }),
  });

  const contractPublicUrl = `${APP_BASE_URL}/contract/sample-token`;
  const contractSignedCoreHtml = `
            <h2 style="color: ${primaryColorClient}; margin-top: 0;">Contract ${escapeHtml(contractId)} signed</h2>
            <p style="color: #333;">The contract has been signed by both parties.</p>
            <p style="margin: 24px 0;">
                    <a href="${escapeHtml(contractPublicUrl)}" style="display: inline-block; background: ${primaryColorClient}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px;">Open contract</a>
                  </p>
                  <p style="color: #999; font-size: 12px;">Or copy this link: ${escapeHtml(contractPublicUrl)}</p>`;
  templates.push({
    id: "client-contract-fully-signed",
    name: "Contract fully signed",
    category: "user_to_client",
    from: clientFrom,
    to: `${userEmail}, ${clientEmail}`,
    trigger: "Both parties have signed the contract",
    subject: `Contract ${contractId} signed`,
    html: buildClientBrandedEmail(profile, contractSignedCoreHtml, supabaseUrl, {
      contract_id: escapeHtml(contractId),
      contract_url: escapeHtml(contractPublicUrl),
    }),
    note: "Sent to freelancer and client emails.",
  });

  const cancelReason = "Project scope changed — both parties agreed to cancel.";
  const contractCancelledCoreHtml = `
      <h2 style="color: ${primaryColorClient}; margin-top: 0;">Contract ${escapeHtml(contractId)} cancelled</h2>
      <p style="color: #333;">This contract has been cancelled.</p>
      <div style="margin: 16px 0; padding: 12px 14px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 10px;">
        <div style="font-weight: 600; color: #111827; margin-bottom: 6px;">Cancellation reason</div>
        <div style="white-space: pre-wrap; color: #374151;">${escapeHtml(cancelReason)}</div>
      </div>
      <p style="margin: 24px 0;">
              <a href="${escapeHtml(contractPublicUrl)}" style="display: inline-block; background: ${primaryColorClient}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px;">Open contract</a>
            </p>
            <p style="color: #999; font-size: 12px;">Or copy this link: ${escapeHtml(contractPublicUrl)}</p>`;
  templates.push({
    id: "client-contract-cancelled",
    name: "Contract cancelled",
    category: "user_to_client",
    from: clientFrom,
    to: `${userEmail}, ${clientEmail}`,
    trigger: "User cancels a sent contract",
    subject: `Contract ${contractId} cancelled`,
    html: buildClientBrandedEmail(profile, contractCancelledCoreHtml, supabaseUrl, {
      contract_id: escapeHtml(contractId),
      contract_url: escapeHtml(contractPublicUrl),
    }),
    note: "Sent to freelancer and client emails.",
  });

  // —— Internal ——
  const supportEmail = "hello@getlance.app";
  templates.push({
    id: "internal-feedback",
    name: "In-app feedback to support",
    category: "internal",
    from: `Lance Feedback <${resendFrom}>`,
    to: supportEmail,
    trigger: "User submits feedback from the app",
    subject: "New feedback from Lance app",
    html: `
      <div style="font-family: ${LANCE_EMAIL_FONT_FAMILY}; max-width: 640px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
        <div style="padding: 16px 20px; background: ${LANCE_AUTH_PRIMARY_COLOR}; color: white;">
          <strong style="font-size: 16px;">New Feedback Submission</strong>
        </div>
        <div style="padding: 20px;">
          <p style="margin-top: 0;"><strong>From:</strong> ${escapeHtml(userName)}</p>
          <p><strong>Email:</strong> ${escapeHtml(userEmail)}</p>
          <p><strong>Page:</strong> Dashboard</p>
          <p><strong>Context:</strong> Sample feedback context</p>
          <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 16px 0;" />
          <p style="margin-bottom: 8px;"><strong>Message</strong></p>
          <div style="white-space: pre-wrap; color: #111827;">Sample feedback message from preview.</div>
        </div>
      </div>
    `,
  });
  templates.push({
    id: "internal-contact",
    name: "Contact form to support",
    category: "internal",
    from: `Lance Contact <${resendFrom}>`,
    to: supportEmail,
    trigger: "User submits contact/help form",
    subject: "New contact message from Lance app",
    html: `
      <div style="font-family: ${LANCE_EMAIL_FONT_FAMILY}; max-width: 640px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
        <div style="padding: 16px 20px; background: ${LANCE_AUTH_PRIMARY_COLOR}; color: white;">
          <strong style="font-size: 16px;">New Contact Message</strong>
        </div>
        <div style="padding: 20px;">
          <p style="margin-top: 0;"><strong>Name:</strong> ${escapeHtml(userName)}</p>
          <p><strong>Email:</strong> ${escapeHtml(userEmail)}</p>
          <p><strong>Page:</strong> Help</p>
          <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 16px 0;" />
          <p style="margin-bottom: 8px;"><strong>Message</strong></p>
          <div style="white-space: pre-wrap; color: #111827;">Sample contact message from preview.</div>
        </div>
      </div>
    `,
  });

  return templates;
}
