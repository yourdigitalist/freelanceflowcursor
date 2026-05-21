// @ts-nocheck
/** Shared Lance → user / client email helpers for Edge Functions. */
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { Resend } from "https://esm.sh/resend@2.0.0";

const RESEND_FROM_EMAIL = (Deno.env.get("RESEND_FROM_EMAIL") || "onboarding@resend.dev").trim();
const APP_BASE_URL = (Deno.env.get("APP_BASE_URL") || "").trim().replace(/\/$/, "");

/** White wordmark for purple email headers (Lance → user). */
export const LANCE_EMAIL_LOGO_WHITE_URL = "https://www.getlance.app/email/lance-logo-white.png";

/** Black wordmark for light footers (all email types). */
export const LANCE_EMAIL_LOGO_BLACK_URL = "https://www.getlance.app/email/lance-logo-black.svg";

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

export function getDefaultLanceHeader(primaryColor: string, logoUrl: string = LANCE_EMAIL_LOGO_WHITE_URL): string {
  const safeLogo = escapeHtml(logoUrl);
  return `<div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
  <div style="padding: 18px 20px; background: ${primaryColor}; color: white;">
    <img src="${safeLogo}" alt="Lance" width="120" height="28" style="height: 28px; max-width: 160px; width: auto; object-fit: contain; display: block; border: 0;" />
  </div>
  <div style="padding: 20px;">`;
}

export function getDefaultLanceFooter(primaryColor: string): string {
  const safeLogo = escapeHtml(LANCE_EMAIL_LOGO_BLACK_URL);
  return `</div><div style="padding: 14px 20px; font-size: 12px; color: #6b7280; border-top: 1px solid #e5e7eb;">
  <img src="${safeLogo}" alt="Lance" width="80" height="20" style="height: 20px; max-width: 100px; width: auto; display: block; margin-bottom: 8px; border: 0;" />
  Sent by <span style="color: ${primaryColor}; font-weight: 600;">Lance</span>
</div></div>`;
}

/** “Sent with Lance” block below client emails (light background → black logo). */
export function getLanceSignature(primaryColor: string): string {
  const safeLogo = escapeHtml(LANCE_EMAIL_LOGO_BLACK_URL);
  return `<div style="text-align:center; margin: 0 auto; padding-top: 16px; font-family: Arial, sans-serif; font-size: 13px; color: #9ca3af;">
  <div>
    This email was sent with
    <a href="https://getlance.app" target="_blank" rel="noopener noreferrer" style="color: ${primaryColor}; text-decoration: none; font-weight: 600;">Lance</a>
  </div>
  <div style="margin-top: 8px;">
    <a href="https://getlance.app" target="_blank" rel="noopener noreferrer" style="text-decoration: none;">
      <img src="${safeLogo}" alt="Lance" width="80" height="20" style="height: 20px; max-width: 80px; width: auto; display: inline-block; border: 0;" />
    </a>
  </div>
</div>`;
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
  const supportUrl = APP_BASE_URL ? `${APP_BASE_URL}/help` : "https://lance.app";

  const [{ data: branding }, { data: comms }] = await Promise.all([
    supabase.from("app_branding").select("primary_color").eq("id", 1).maybeSingle(),
    supabase
      .from("app_comms_defaults")
      .select(
        "email_header_html, email_footer_html, lance_email_header_html, lance_email_footer_html, account_deleted_subject, account_deleted_body",
      )
      .eq("id", 1)
      .maybeSingle(),
  ]);

  const primaryColor = (branding?.primary_color as string | null) || "#9B63E9";
  const headerTpl = (comms?.lance_email_header_html as string | null) || (comms?.email_header_html as string | null) || "";
  const footerTpl = (comms?.lance_email_footer_html as string | null) || (comms?.email_footer_html as string | null) || "";

  const subject =
    ((comms?.account_deleted_subject as string | null) || "").trim() || "Your Lance account has been deleted";

  const fallbackBody = `Hi ${name},

Your Lance account has been deleted as requested. Your data has been removed from our systems.

You will not be charged — if you had not completed checkout, no payment method was on file.

If you did not request this deletion, please contact us: ${supportUrl}

Thanks,
The Lance team`;

  const customBody = (comms?.account_deleted_body as string | null) || "";
  const body = customBody.trim()
    ? replaceTokens(customBody, { user_name: name, support_url: supportUrl })
    : fallbackBody;

  const safeName = escapeHtml(name);
  const safeSupportUrl = escapeHtml(supportUrl);
  const safeBody = escapeHtml(body).replace(/\n/g, "<br>");

  const tokens = {
    user_name: safeName,
    support_url: safeSupportUrl,
    body_html: `<p>${safeBody}</p>`,
    primary_color: primaryColor,
    logo_url: LANCE_EMAIL_LOGO_WHITE_URL,
    logo_footer_url: LANCE_EMAIL_LOGO_BLACK_URL,
  };

  const header = headerTpl.trim() ? replaceTokens(headerTpl, tokens) : getDefaultLanceHeader(primaryColor);
  const footer = footerTpl.trim() ? replaceTokens(footerTpl, tokens) : getDefaultLanceFooter(primaryColor);
  const html = `${header}<h2 style="margin: 0 0 12px; color: ${primaryColor};">${escapeHtml(subject)}</h2><p>${safeBody}</p>${footer}`;

  const resend = new Resend(resendKey);
  const { error: sendError } = await resend.emails.send({
    from: `Lance <${RESEND_FROM_EMAIL}>`,
    to: email,
    subject,
    text: body,
    html,
  });

  if (sendError) {
    console.error("Account deleted email send error:", sendError);
    return { ok: false, error: sendError.message || "Failed to send email" };
  }

  return { ok: true };
}
