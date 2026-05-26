// @ts-nocheck
/** Shared Get Lance → user email helpers for Edge Functions. */
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { Resend } from "https://esm.sh/resend@2.0.0";

export const LANCE_PRODUCT_NAME = "Get Lance";

const RESEND_FROM_EMAIL = (Deno.env.get("RESEND_FROM_EMAIL") || "onboarding@resend.dev").trim();
const APP_BASE_URL = (Deno.env.get("APP_BASE_URL") || "https://www.getlance.app").trim().replace(/\/$/, "");

/** White wordmark for purple email headers (Get Lance → user). */
export const LANCE_EMAIL_LOGO_WHITE_URL = "https://www.getlance.app/email/lance-logo-white.png";

/** Black wordmark for light footers (PNG — SVG is blocked in Gmail/Outlook mobile). */
export const LANCE_EMAIL_LOGO_BLACK_URL = "https://www.getlance.app/email/lance-logo-black.png";

const LANCE_EMAIL_LOGO_BLACK_HEIGHT_PX = 20;
const LANCE_EMAIL_LOGO_BLACK_WIDTH_PX = 99;

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
<body style="margin:0;padding:0;background-color:#f3f4f6;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#f3f4f6;">
    <tr>
      <td align="center" style="padding:32px 20px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:640px;width:100%;">
          <tr>
            <td style="font-family:Arial,Helvetica,sans-serif;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;background:#ffffff;">
              <div style="padding:18px 20px;background:${safeColor};color:#ffffff;">
                <a href="${safeBase}" target="_blank" rel="noopener" style="text-decoration:none;color:#ffffff;">
                  <img src="${safeLogo}" alt="${safeName}" width="120" height="28" style="height:28px;max-width:160px;width:auto;object-fit:contain;display:block;border:0;" />
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
  const sentToLine = recipientEmail
    ? `<p style="margin:12px 0 0 0;">This email was sent to ${escapeHtml(recipientEmail)}.</p>`
    : "";
  return `</div>
              <div style="padding:14px 20px;font-size:12px;color:#6b7280;border-top:1px solid #e5e7eb;">
                <img src="${safeLogo}" alt="${safeName}" width="${LANCE_EMAIL_LOGO_BLACK_WIDTH_PX}" height="${LANCE_EMAIL_LOGO_BLACK_HEIGHT_PX}" style="height:${LANCE_EMAIL_LOGO_BLACK_HEIGHT_PX}px;max-width:100px;width:auto;display:block;margin-bottom:8px;border:0;" />
                Sent by <span style="color:${safeColor};font-weight:600;">${safeName}</span>
                <span style="color:#9ca3af;"> · </span>
                <a href="${safeBase}/help" style="color:#6b7280;font-weight:normal;text-decoration:none;">Help</a>
                <span style="color:#9ca3af;"> · </span>
                <a href="${safeBase}/terms" style="color:#6b7280;font-weight:normal;text-decoration:none;">Terms</a>
                <span style="color:#9ca3af;"> · </span>
                <a href="${safeBase}/privacy" style="color:#6b7280;font-weight:normal;text-decoration:none;">Privacy</a>
                ${sentToLine}
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
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:640px;margin:16px auto 0;font-family:Arial,Helvetica,sans-serif;">
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
      return replaceTokens(`${header}${footer}`, { ...tokens, body_html: contentHtml });
    }
    return `${header}${contentHtml}${footer}`;
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

  const name = (input.name || "there").trim() || "there";
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

Your ${LANCE_PRODUCT_NAME} account has been deleted as requested. Your data has been removed from our systems.

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
