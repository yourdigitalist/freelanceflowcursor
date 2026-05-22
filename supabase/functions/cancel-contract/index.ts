import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { getLanceSignature } from "../_shared/lance-email.ts";
import {
  channelEnabled,
  getContractPrefs,
  type NotificationPreferences,
  upsertUserNotification,
} from "../_shared/user-notification.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const RESEND_FROM_EMAIL = (Deno.env.get("RESEND_FROM_EMAIL") || "onboarding@resend.dev").trim();
const APP_BASE_URL = (Deno.env.get("APP_BASE_URL") || "").trim().replace(/\/$/, "");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function escapeHtml(text: string | null | undefined): string {
  if (!text) return "";
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function replaceTokens(template: string, tokens: Record<string, string>): string {
  return Object.entries(tokens).reduce((out, [key, value]) => {
    const re = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, "gi");
    return out.replace(re, value);
  }, template);
}

const EMAIL_COMMS_CONFIG_PREFIX = "LANCE_EMAIL_CONFIG::";
function parseEmailCommsConfig(raw: string | null | undefined): { logoLight: string; logoDark: string; logoVariant: "light" | "dark" } {
  const fallback = { logoLight: "", logoDark: "", logoVariant: "light" as const };
  const text = (raw || "").trim();
  if (!text.startsWith(EMAIL_COMMS_CONFIG_PREFIX)) return fallback;
  try {
    const parsed = JSON.parse(text.slice(EMAIL_COMMS_CONFIG_PREFIX.length));
    const logoLight = typeof parsed?.logoDefault === "string"
      ? parsed.logoDefault
      : typeof parsed?.logoLight === "string"
        ? parsed.logoLight
        : "";
    const logoDark = typeof parsed?.logoSecondary === "string"
      ? parsed.logoSecondary
      : typeof parsed?.logoDark === "string"
        ? parsed.logoDark
        : "";
    return {
      logoLight,
      logoDark,
      logoVariant: parsed?.logoVariant === "dark" ? "dark" : "light",
    };
  } catch {
    return fallback;
  }
}

function getDefaultClientHeader(logoUrl: string, businessName: string, primaryColor: string): string {
  return `<div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
  <div style="padding: 18px 20px; background: ${primaryColor}; color: white;">
    ${logoUrl ? `<img src="${logoUrl}" alt="${escapeHtml(businessName)}" style="height: 28px; max-width: 160px; object-fit: contain;" />` : `<strong style="font-size: 18px;">${escapeHtml(businessName)}</strong>`}
  </div>
  <div style="padding: 20px;">`;
}

function getDefaultClientFooter(primaryColor: string, businessName: string, businessEmail: string): string {
  const safeName = escapeHtml(businessName || "Your Business");
  const safeEmail = escapeHtml(businessEmail || "");
  return `</div><div style="padding: 14px 20px; font-size: 12px; color: #6b7280; border-top: 1px solid #e5e7eb;">
  Sent by <span style="color: ${primaryColor}; font-weight: 600;">${safeName}</span>${safeEmail ? ` · <span>${safeEmail}</span>` : ""}
</div></div>`;
}

function normalizeLogoUrl(rawLogo: string, supabaseUrl: string): string {
  const trimmed = (rawLogo || "").trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
  const base = (supabaseUrl || "").replace(/\/$/, "");
  return `${base}${trimmed.startsWith("/") ? trimmed : `/${trimmed}`}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    if (!Deno.env.get("RESEND_API_KEY")) {
      return new Response(JSON.stringify({ error: "Email is not configured (missing RESEND_API_KEY)." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!RESEND_FROM_EMAIL || !RESEND_FROM_EMAIL.includes("@")) {
      return new Response(JSON.stringify({ error: "Email is not configured (missing or invalid RESEND_FROM_EMAIL)." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: auth, error: authError } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !auth?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { contractId, reason, origin } = await req.json();
    const trimmedReason = String(reason || "").trim();
    if (!contractId || !trimmedReason) {
      return new Response(JSON.stringify({ error: "contractId and reason are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: contract, error: contractError } = await supabase
      .from("contracts")
      .select("id, user_id, identifier, public_token, status, client_signed_at, client_email, client_name, freelancer_email, freelancer_name")
      .eq("id", contractId)
      .single();

    if (contractError || !contract) {
      return new Response(JSON.stringify({ error: contractError?.message || "Contract not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (contract.user_id !== auth.user.id) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (contract.status === "cancelled") {
      return new Response(JSON.stringify({ error: "Contract is already cancelled." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const cancelledAt = new Date().toISOString();
    const { error: updateError } = await supabase
      .from("contracts")
      .update({
        status: "cancelled",
        cancelled_at: cancelledAt,
        cancellation_reason: trimmedReason,
      } as never)
      .eq("id", contract.id)
      .eq("user_id", auth.user.id);

    if (updateError) {
      return new Response(JSON.stringify({ error: updateError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const hadClientSignature = !!contract.client_signed_at;

    const { data: profile } = await supabase
      .from("profiles")
      .select("business_name, business_email, email, full_name, business_logo, client_email_primary_color, client_email_header_html, client_email_footer_html, notification_preferences")
      .eq("user_id", auth.user.id)
      .maybeSingle();

    const contractPrefs = getContractPrefs(
      (profile?.notification_preferences as NotificationPreferences | null) || null,
    );
    const contractLabel = contract.identifier ? `Contract ${contract.identifier}` : "Contract";
    const cancelBody = hadClientSignature
      ? `${contractLabel} was cancelled after the client had signed.`
      : `${contractLabel} was cancelled.`;
    if (channelEnabled(contractPrefs?.cancelled, "inApp")) {
      await upsertUserNotification(supabase, {
        user_id: auth.user.id,
        type: "contract",
        title: "Contract cancelled",
        body: cancelBody,
        link: `/contracts/${contract.id}`,
        event_key: `contract_cancelled:${contract.id}:${cancelledAt}`,
      });
    }

    const primaryColor = (profile?.client_email_primary_color || "#9B63E9").trim();
    const fromDisplayName = (profile?.business_name || profile?.full_name || "Your Business").trim();
    const replyToEmail = (profile?.business_email || profile?.email || "").trim();
    const logoUrl = normalizeLogoUrl(profile?.business_logo || "", supabaseUrl);
    const baseUrl = String(origin || APP_BASE_URL || "").trim().replace(/\/$/, "");
    const contractUrl = baseUrl ? `${baseUrl}/contract/${contract.public_token}` : "";

    const safeIdentifier = escapeHtml(contract.identifier);
    const safeReason = escapeHtml(trimmedReason);
    const coreHtml = `
      <h2 style="color: ${primaryColor}; margin-top: 0;">Contract ${safeIdentifier} cancelled</h2>
      <p style="color: #333;">This contract has been cancelled.</p>
      <div style="margin: 16px 0; padding: 12px 14px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 10px;">
        <div style="font-weight: 600; color: #111827; margin-bottom: 6px;">Cancellation reason</div>
        <div style="white-space: pre-wrap; color: #374151;">${safeReason}</div>
      </div>
      ${
        contractUrl
          ? `<p style="margin: 24px 0;">
              <a href="${escapeHtml(contractUrl)}" style="display: inline-block; background: ${primaryColor}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px;">Open contract</a>
            </p>
            <p style="color: #999; font-size: 12px;">Or copy this link: ${escapeHtml(contractUrl)}</p>`
          : ""
      }
    `;

    const tokens = {
      business_name: escapeHtml(fromDisplayName),
      logo_url: logoUrl,
      primary_color: primaryColor,
      body_html: coreHtml,
      contract_id: safeIdentifier,
      contract_url: escapeHtml(contractUrl),
    };
    const footerTpl = (profile?.client_email_footer_html || "").trim();
    const commsConfig = parseEmailCommsConfig(profile?.client_email_header_html);
    const selectedRawLogo = commsConfig.logoVariant === "dark"
      ? (commsConfig.logoDark || profile?.business_logo || commsConfig.logoLight || "")
      : (profile?.business_logo || commsConfig.logoLight || commsConfig.logoDark || "");
    const selectedLogoUrl = normalizeLogoUrl(selectedRawLogo, supabaseUrl);
    const header = getDefaultClientHeader(selectedLogoUrl || logoUrl, fromDisplayName, primaryColor);
    const footer = footerTpl ? replaceTokens(footerTpl, tokens) : getDefaultClientFooter(primaryColor, fromDisplayName, replyToEmail);
    const emailHtml = `${header}${coreHtml}${footer}${getLanceSignature(primaryColor)}`;

    const recipients = [contract.freelancer_email, contract.client_email]
      .map((x) => (x || "").trim())
      .filter(Boolean);
    const uniqueRecipients = Array.from(new Set(recipients));
    if (channelEnabled(contractPrefs?.cancelled, "email") && uniqueRecipients.length > 0) {
      await resend.emails.send({
        from: `${fromDisplayName} <${RESEND_FROM_EMAIL}>`,
        to: uniqueRecipients,
        subject: `Contract ${contract.identifier} cancelled`,
        html: emailHtml,
        ...(replyToEmail ? { reply_to: replyToEmail } : {}),
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

