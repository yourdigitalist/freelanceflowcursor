// @ts-nocheck
/** Shared Get Lance → user email helpers for Edge Functions. */
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { Resend } from "https://esm.sh/resend@2.0.0";
import {
  LANCE_EMAIL_FONT_FAMILY,
  LANCE_EMAIL_LOGO_BLACK_HEIGHT_PX,
  LANCE_EMAIL_LOGO_BLACK_WIDTH_PX,
  LANCE_EMAIL_LOGO_WHITE_HEIGHT_PX,
  LANCE_EMAIL_LOGO_WHITE_MAX_WIDTH_PX,
  LANCE_EMAIL_LOGO_WHITE_WIDTH_PX,
} from "./email-styles.ts";

export const LANCE_PRODUCT_NAME = "Get Lance";

const RESEND_FROM_EMAIL = (Deno.env.get("RESEND_FROM_EMAIL") || "onboarding@resend.dev").trim();
const APP_BASE_URL = (Deno.env.get("APP_BASE_URL") || "https://www.getlance.app").trim().replace(/\/$/, "");

/** White wordmark for purple email headers (Get Lance → user). */
export const LANCE_EMAIL_LOGO_WHITE_URL = "https://www.getlance.app/email/lance-logo-white.png";

/** Black wordmark for light footers (PNG — SVG is blocked in Gmail/Outlook mobile). */
export const LANCE_EMAIL_LOGO_BLACK_URL = "https://www.getlance.app/email/lance-logo-black.png";

export function getResendFromEmail(): string {
  return RESEND_FROM_EMAIL;
}

export function getLanceFromAddress(fromEmail: string = RESEND_FROM_EMAIL): string {
  return `${LANCE_PRODUCT_NAME} <${fromEmail}>`;
}

export function escapeHtml(text: string | null | undefined): string {
  if (!text) return "";
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function replaceTokens(template: string, tokens: Record<string, string>): string {
  return Object.entries(tokens).reduce((out, [key, value]) => {
    const re = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, "gi");
    return out.replace(re, value);
  }, template);
}

/** First name for Lance → user salutations; falls back to "Freelancer". */
export function getLanceUserFirstName(fullName: string | null | undefined): string {
  const trimmed = (fullName || "").trim();
  if (!trimmed) return "Freelancer";
  const first = trimmed.split(/\s+/)[0]?.trim();
  return first || "Freelancer";
}

export function getLanceNotificationSettingsUrl(): string {
  return `${APP_BASE_URL}/settings/notifications`;
}

/** Recipient lines below the standard Lance footer links (not used on auth emails). */
export function getLanceRecipientMetaHtml(recipientEmail?: string): string {
  if (!recipientEmail) return "";
  const prefsUrl = escapeHtml(getLanceNotificationSettingsUrl());
  return `<p style="margin:12px 0 0 0;">This email was sent to ${escapeHtml(recipientEmail)}.</p>
<p style="margin:8px 0 0 0;">You can edit your communication preferences at any time <a href="${prefsUrl}" style="color:#6b7280;text-decoration:underline;">here</a>.</p>`;
}

function appendLanceRecipientMetaToEmail(html: string, recipientEmail?: string): string {
  if (!recipientEmail || html.includes("communication preferences")) return html;
  const meta = getLanceRecipientMetaHtml(recipientEmail);
  const privacyIdx = html.indexOf("/privacy\"");
  if (privacyIdx !== -1) {
    const anchorEnd = html.indexOf("</a>", privacyIdx);
    if (anchorEnd !== -1) {
      return html.slice(0, anchorEnd + 4) + meta + html.slice(anchorEnd + 4);
    }
  }
  return html.replace(/<\/body>/i, `${meta}</body>`);
}

function lanceButtonHtml(href: string, label: string, primaryColor: string): string {
  return `<p style="margin:16px 0 0;"><a href="${escapeHtml(href)}" style="display:inline-block;background:${escapeHtml(primaryColor)};color:#ffffff !important;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">${escapeHtml(label)}</a></p>`;
}

export type TrialReminderEmail = {
  subject: string;
  contentHtml: string;
  text: string;
};

export function buildTrialReminderEmail(
  daysLeft: 0 | 1 | 3,
  fullName: string | null | undefined,
  billingUrl: string,
  primaryColor: string,
): TrialReminderEmail {
  const firstName = getLanceUserFirstName(fullName);
  const safeColor = escapeHtml(primaryColor);
  const safeBilling = escapeHtml(billingUrl);

  if (daysLeft === 3) {
    const subject = "Your Lance trial ends in 3 days";
    const heading = "Your trial ends in 3 days";
    const text = `Hi ${firstName},

You've got 3 days left on your Lance trial. After that, you'll lose access to your clients, projects, invoices, and contracts.

Add your payment details now to keep everything exactly as you left it.

Upgrade now: ${billingUrl}

Questions about the plan? Reply to this email.`;
    const contentHtml = `<h2 style="margin:0 0 12px;font-size:18px;color:${safeColor};">${escapeHtml(heading)}</h2>
<p style="margin:0 0 12px;color:#374151;">Hi ${escapeHtml(firstName)},</p>
<p style="margin:0 0 12px;color:#374151;">You've got 3 days left on your Lance trial. After that, you'll lose access to your clients, projects, invoices, and contracts.</p>
<p style="margin:0 0 16px;color:#374151;">Add your payment details now to keep everything exactly as you left it.</p>
${lanceButtonHtml(billingUrl, "Upgrade now", primaryColor)}
<p style="margin:16px 0 0;color:#374151;">Questions about the plan? Reply to this email.</p>`;
    return { subject, contentHtml, text };
  }

  if (daysLeft === 1) {
    const subject = "Your Lance trial ends tomorrow";
    const heading = "Last day of your trial";
    const text = `Hi ${firstName},

Your Lance trial ends tomorrow. Add your payment details now to keep access to everything you've set up.

Upgrade now: ${billingUrl}

Questions? Just reply to this email.`;
    const contentHtml = `<h2 style="margin:0 0 12px;font-size:18px;color:${safeColor};">${escapeHtml(heading)}</h2>
<p style="margin:0 0 12px;color:#374151;">Hi ${escapeHtml(firstName)},</p>
<p style="margin:0 0 16px;color:#374151;">Your Lance trial ends tomorrow. Add your payment details now to keep access to everything you've set up.</p>
${lanceButtonHtml(billingUrl, "Upgrade now", primaryColor)}
<p style="margin:16px 0 0;font-size:13px;color:#6b7280;">Questions? Just reply to this email.</p>`;
    return { subject, contentHtml, text };
  }

  const subject = "Your Lance trial ends today";
  const heading = "Today's your last day";
  const text = `Hi ${firstName},

Your Lance trial ends today. After that, you won't be able to access your clients, projects, invoices, or contracts.

It takes a minute to upgrade and everything stays exactly as you left it.

Upgrade now: ${billingUrl}

Questions? Just reply to this email.`;
  const contentHtml = `<h2 style="margin:0 0 12px;font-size:18px;color:${safeColor};">${escapeHtml(heading)}</h2>
<p style="margin:0 0 12px;color:#374151;">Hi ${escapeHtml(firstName)},</p>
<p style="margin:0 0 12px;color:#374151;">Your Lance trial ends today. After that, you won't be able to access your clients, projects, invoices, or contracts.</p>
<p style="margin:0 0 16px;color:#374151;">It takes a minute to upgrade and everything stays exactly as you left it.</p>
${lanceButtonHtml(billingUrl, "Upgrade now", primaryColor)}
<p style="margin:16px 0 0;color:#374151;">Questions? Just reply to this email.</p>`;
  return { subject, contentHtml, text };
}

export type AnnouncementEmailInput = {
  title: string;
  body: string;
  fullName: string | null | undefined;
  link?: string;
  ctaLabel?: string;
  primaryColor: string;
};

export function buildAnnouncementEmail(input: AnnouncementEmailInput): {
  subject: string;
  contentHtml: string;
  text: string;
} {
  const firstName = getLanceUserFirstName(input.fullName);
  const safeTitle = escapeHtml(input.title.trim());
  const bodySource = (input.body || "").trim();
  const safeBody = bodySource
    ? escapeHtml(bodySource).replace(/\n/g, "<br>")
    : "";
  const link = (input.link || "").trim();
  const ctaLabel = (input.ctaLabel || "Learn more").trim() || "Learn more";
  const safeColor = escapeHtml(input.primaryColor);

  const bodyParagraph = safeBody
    ? `<p style="margin:0 0 16px;color:#374151;">${safeBody}</p>`
    : "";
  const ctaBlock = link
    ? lanceButtonHtml(link, ctaLabel, input.primaryColor)
    : "";

  const contentHtml = `<h2 style="margin:0 0 12px;font-size:18px;color:${safeColor};">${safeTitle}</h2>
<p style="margin:0 0 12px;color:#374151;">Hi ${escapeHtml(firstName)},</p>
${bodyParagraph}
${ctaBlock}`;

  const textParts = [
    `Hi ${firstName},`,
    "",
    bodySource || "",
    link ? `\n${ctaLabel}: ${link}` : "",
  ].filter((part, i, arr) => !(part === "" && arr[i + 1] === ""));

  return {
    subject: input.title.trim(),
    contentHtml,
    text: textParts.join("\n").trim(),
  };
}

/** Matches docs/EMAIL_TEMPLATE_SUPABASE.html — purple header + content area open. */
export function getDefaultLanceHeader(primaryColor: string, logoUrl: string = LANCE_EMAIL_LOGO_WHITE_URL): string {
  const safeLogo = escapeHtml(logoUrl);
  const safeColor = escapeHtml(primaryColor);
  const safeBase = escapeHtml(APP_BASE_URL);
  const safeName = escapeHtml(LANCE_PRODUCT_NAME);
  return `<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
</head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:${LANCE_EMAIL_FONT_FAMILY};">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#f3f4f6;">
    <tr>
      <td align="center" style="padding:32px 20px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:640px;width:100%;">
          <tr>
            <td style="font-family:${LANCE_EMAIL_FONT_FAMILY};border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;background:#ffffff;">
              <div style="padding:18px 20px;background:${safeColor};color:#ffffff;">
                <a href="${safeBase}" target="_blank" rel="noopener" style="text-decoration:none;color:#ffffff;">
                  <img src="${safeLogo}" alt="${safeName}" width="${LANCE_EMAIL_LOGO_WHITE_WIDTH_PX}" height="${LANCE_EMAIL_LOGO_WHITE_HEIGHT_PX}" style="height:${LANCE_EMAIL_LOGO_WHITE_HEIGHT_PX}px;max-width:${LANCE_EMAIL_LOGO_WHITE_MAX_WIDTH_PX}px;width:auto;object-fit:contain;display:block;border:0;" />
                </a>
              </div>
              <div style="padding:24px 20px;font-size:15px;line-height:1.6;color:#111827;">`;
}

/** Closes content area + footer (Sent by Get Lance, help links). */
export function getDefaultLanceFooter(primaryColor: string, recipientEmail?: string): string {
  const safeLogo = escapeHtml(LANCE_EMAIL_LOGO_BLACK_URL);
  const safeColor = escapeHtml(primaryColor);
  const safeName = escapeHtml(LANCE_PRODUCT_NAME);
  const safeBase = escapeHtml(APP_BASE_URL);
  const recipientMeta = getLanceRecipientMetaHtml(recipientEmail);
  return `</div>
              <div style="padding:14px 20px;font-size:12px;color:#6b7280;border-top:1px solid #e5e7eb;">
                <img src="${safeLogo}" alt="${safeName}" width="${LANCE_EMAIL_LOGO_BLACK_WIDTH_PX}" height="${LANCE_EMAIL_LOGO_BLACK_HEIGHT_PX}" style="height:${LANCE_EMAIL_LOGO_BLACK_HEIGHT_PX}px;max-width:80px;width:auto;display:block;margin-bottom:8px;border:0;" />
                Sent by <span style="color:${safeColor};font-weight:600;">${safeName}</span>
                <span style="color:#9ca3af;"> · </span>
                <a href="${safeBase}/help" style="color:#6b7280;font-weight:normal;text-decoration:none;">Help</a>
                <span style="color:#9ca3af;"> · </span>
                <a href="${safeBase}/terms" style="color:#6b7280;font-weight:normal;text-decoration:none;">Terms</a>
                <span style="color:#9ca3af;"> · </span>
                <a href="${safeBase}/privacy" style="color:#6b7280;font-weight:normal;text-decoration:none;">Privacy</a>
                ${recipientMeta}
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/** “Sent with Get Lance” block below client emails (light background → black logo). */
export function getLanceSignature(primaryColor: string): string {
  const safeLogo = escapeHtml(LANCE_EMAIL_LOGO_BLACK_URL);
  const safeColor = escapeHtml(primaryColor);
  const safeName = escapeHtml(LANCE_PRODUCT_NAME);
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:640px;margin:16px auto 0;font-family:${LANCE_EMAIL_FONT_FAMILY};">
  <tr>
    <td align="center" style="padding-top:16px;font-size:13px;line-height:1.5;color:#9ca3af;">
      <p style="margin:0 0 10px 0;">This email was sent with <a href="${escapeHtml(APP_BASE_URL)}" target="_blank" rel="noopener noreferrer" style="color:${safeColor};text-decoration:none;font-weight:600;">${safeName}</a></p>
      <a href="${escapeHtml(APP_BASE_URL)}" target="_blank" rel="noopener noreferrer" style="text-decoration:none;">
        <img src="${safeLogo}" alt="${safeName}" width="${LANCE_EMAIL_LOGO_BLACK_WIDTH_PX}" height="${LANCE_EMAIL_LOGO_BLACK_HEIGHT_PX}" style="height:${LANCE_EMAIL_LOGO_BLACK_HEIGHT_PX}px;width:${LANCE_EMAIL_LOGO_BLACK_WIDTH_PX}px;display:block;margin:0 auto;border:0;outline:none;text-decoration:none;" />
      </a>
    </td>
  </tr>
</table>`;
}

export type LanceEmailComms = {
  primaryColor: string;
  headerTpl: string;
  footerTpl: string;
};

export async function loadLanceEmailComms(supabase: SupabaseClient): Promise<LanceEmailComms> {
  const [{ data: branding }, { data: comms }] = await Promise.all([
    supabase.from("app_branding").select("primary_color").eq("id", 1).maybeSingle(),
    supabase
      .from("app_comms_defaults")
      .select("email_header_html, email_footer_html, lance_email_header_html, lance_email_footer_html")
      .eq("id", 1)
      .maybeSingle(),
  ]);
  return {
    primaryColor: (branding?.primary_color as string | null) || "#9B63E9",
    headerTpl: (comms?.lance_email_header_html as string | null) || (comms?.email_header_html as string | null) || "",
    footerTpl: (comms?.lance_email_footer_html as string | null) || (comms?.email_footer_html as string | null) || "",
  };
}

export function buildLanceUserEmail(
  comms: LanceEmailComms,
  contentHtml: string,
  extraTokens: Record<string, string> = {},
  recipientEmail?: string,
): string {
  const tokens: Record<string, string> = {
    primary_color: comms.primaryColor,
    logo_url: LANCE_EMAIL_LOGO_WHITE_URL,
    logo_footer_url: LANCE_EMAIL_LOGO_BLACK_URL,
    product_name: LANCE_PRODUCT_NAME,
    body_html: contentHtml,
    ...extraTokens,
  };

  if (comms.headerTpl.trim()) {
    const header = replaceTokens(comms.headerTpl, tokens);
    const footer = comms.footerTpl.trim()
      ? replaceTokens(comms.footerTpl, tokens)
      : getDefaultLanceFooter(comms.primaryColor, recipientEmail);
    if (header.includes("{{body_html}}") || footer.includes("{{body_html}}")) {
      return appendLanceRecipientMetaToEmail(
        replaceTokens(`${header}${footer}`, { ...tokens, body_html: contentHtml }),
        recipientEmail,
      );
    }
    return appendLanceRecipientMetaToEmail(`${header}${contentHtml}${footer}`, recipientEmail);
  }

  return `${getDefaultLanceHeader(comms.primaryColor)}${contentHtml}${getDefaultLanceFooter(comms.primaryColor, recipientEmail)}`;
}

export function plainTextToLanceContentHtml(
  text: string,
  subject: string,
  primaryColor: string,
): string {
  const safeSubject = escapeHtml(subject);
  const safeColor = escapeHtml(primaryColor);
  const safeBody = escapeHtml(text).replace(/\n/g, "<br>");
  return `<h2 style="margin:0 0 16px 0;font-size:18px;color:${safeColor};">${safeSubject}</h2>
<p style="margin:0;color:#374151;">${safeBody}</p>`;
}

export type SendLanceUserEmailInput = {
  to: string | string[];
  subject: string;
  text: string;
  contentHtml: string;
  comms?: LanceEmailComms;
  recipientEmail?: string;
};

export async function sendLanceUserEmail(
  resend: Resend,
  supabase: SupabaseClient,
  input: SendLanceUserEmailInput,
): Promise<{ ok: boolean; error?: string }> {
  const comms = input.comms ?? (await loadLanceEmailComms(supabase));
  const toList = Array.isArray(input.to) ? input.to : [input.to];
  const recipient = input.recipientEmail ?? (typeof input.to === "string" ? input.to : toList[0]);
  const html = buildLanceUserEmail(comms, input.contentHtml, {}, recipient);

  const { error: sendError } = await resend.emails.send({
    from: getLanceFromAddress(),
    to: toList,
    subject: input.subject,
    text: input.text,
    html,
  });

  if (sendError) {
    return { ok: false, error: sendError.message || "Failed to send email" };
  }
  return { ok: true };
}

export type AccountDeletedEmailInput = {
  email: string;
  name: string;
};

export type AccountDeletedEmailResult = {
  ok: boolean;
  error?: string;
};

export async function sendAccountDeletedEmail(
  supabase: SupabaseClient,
  input: AccountDeletedEmailInput,
): Promise<AccountDeletedEmailResult> {
  const resendKey = Deno.env.get("RESEND_API_KEY");
  if (!resendKey) {
    return { ok: false, error: "RESEND_API_KEY not set" };
  }
  if (!RESEND_FROM_EMAIL || !RESEND_FROM_EMAIL.includes("@")) {
    return { ok: false, error: "RESEND_FROM_EMAIL not set" };
  }

  const email = input.email?.trim();
  if (!email) {
    return { ok: false, error: "Missing recipient email" };
  }

  const name = getLanceUserFirstName(input.name);
  const supportUrl = `${APP_BASE_URL}/help`;

  const [{ data: commsRow }, comms] = await Promise.all([
    supabase
      .from("app_comms_defaults")
      .select("account_deleted_subject, account_deleted_body")
      .eq("id", 1)
      .maybeSingle(),
    loadLanceEmailComms(supabase),
  ]);

  const subject =
    ((commsRow?.account_deleted_subject as string | null) || "").trim() ||
    `Your ${LANCE_PRODUCT_NAME} account has been deleted`;

  const fallbackBody = `Hi ${name},

Your Lance account has been deleted as requested. Your data has been removed from our systems.

You will not be charged — if you had not completed checkout, no payment method was on file.

If you did not request this deletion, please contact us: ${supportUrl}

Thanks,
The ${LANCE_PRODUCT_NAME} team`;

  const customBody = (commsRow?.account_deleted_body as string | null) || "";
  const body = customBody.trim()
    ? replaceTokens(customBody, { user_name: name, support_url: supportUrl })
    : fallbackBody;

  const safeName = escapeHtml(name);
  const safeSupportUrl = escapeHtml(supportUrl);
  const safeBody = escapeHtml(body).replace(/\n/g, "<br>");
  const contentHtml = `<h2 style="margin:0 0 12px;font-size:18px;color:${escapeHtml(comms.primaryColor)};">${escapeHtml(subject)}</h2><p style="margin:0;color:#374151;">${safeBody}</p>
<p style="margin:16px 0 0;"><a href="${safeSupportUrl}" style="display:inline-block;background:${escapeHtml(comms.primaryColor)};color:#ffffff !important;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">Help center</a></p>`;

  const resend = new Resend(resendKey);
  const result = await sendLanceUserEmail(resend, supabase, {
    to: email,
    subject,
    text: body,
    contentHtml,
    comms,
    recipientEmail: email,
  });

  if (!result.ok) {
    console.error("Account deleted email send error:", result.error);
  }
  return result;
}
