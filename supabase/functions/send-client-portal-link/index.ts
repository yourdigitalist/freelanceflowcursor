import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { getLanceSignature } from "../_shared/lance-email.ts";
import {
  escapeHtml,
  getDefaultClientFooter,
  getDefaultClientHeader,
  normalizeLogoUrl,
  parseEmailCommsConfig,
  replaceTokens,
} from "../_shared/client-email-comms.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const RESEND_FROM_EMAIL = (Deno.env.get("RESEND_FROM_EMAIL") || "onboarding@resend.dev").trim();
const APP_BASE_URL = (Deno.env.get("APP_BASE_URL") || "").trim().replace(/\/$/, "");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    if (!Deno.env.get("RESEND_API_KEY")) {
      return new Response(JSON.stringify({ error: "Email is not configured." }), {
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

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { clientId, origin, recipientEmail } = await req.json();
    if (!clientId) {
      return new Response(JSON.stringify({ error: "clientId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: client, error: clientErr } = await supabase
      .from("clients")
      .select("id, name, email, portal_enabled, portal_token")
      .eq("id", clientId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (clientErr || !client) {
      return new Response(JSON.stringify({ error: "Client not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!client.portal_enabled || !client.portal_token) {
      return new Response(JSON.stringify({ error: "Enable the client portal before sending the link." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const toEmail = (recipientEmail || client.email || "").trim();
    if (!toEmail) {
      return new Response(JSON.stringify({ error: "Client email is required to send the portal link." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select(
        "full_name, business_name, business_email, email, business_logo, client_email_primary_color, client_email_header_html, client_email_footer_html",
      )
      .eq("user_id", user.id)
      .maybeSingle();

    const baseUrlFromRequest = (origin && typeof origin === "string") ? origin.trim().replace(/\/$/, "") : "";
    const baseUrl = baseUrlFromRequest || APP_BASE_URL || "https://app.example.com";
    const portalUrl = `${baseUrl}/portal/${client.portal_token}`;

    const primaryColor = (profile?.client_email_primary_color || "#9B63E9").trim();
    const fromDisplayName = (profile?.business_name || profile?.full_name || "Your Business").trim();
    const replyToEmail = (profile?.business_email || profile?.email || "").trim();
    const rawLogo = (profile?.business_logo || "").trim();
    const logoUrl = normalizeLogoUrl(rawLogo, Deno.env.get("SUPABASE_URL") || "");

    const safeClientName = escapeHtml(client.name);
    const coreHtml = `
      <h2 style="color: ${primaryColor}; margin-top: 0;">Your portal is ready</h2>
      <p style="color: #333;">Hi ${safeClientName}, your portal is ready. ${escapeHtml(fromDisplayName)} has set up a dedicated space for you — open it to get started.</p>
      <p style="margin: 24px 0;">
        <a href="${escapeHtml(portalUrl)}" style="display: inline-block; background: ${primaryColor}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px;">Open client portal</a>
      </p>
      <p style="color: #999; font-size: 12px;">Or copy this link: ${escapeHtml(portalUrl)}</p>
    `;

    const tokens = {
      business_name: escapeHtml(fromDisplayName),
      logo_url: logoUrl,
      primary_color: primaryColor,
      body_html: coreHtml,
      portal_url: escapeHtml(portalUrl),
      client_name: safeClientName,
    };

    const commsConfig = parseEmailCommsConfig(profile?.client_email_header_html);
    const selectedRawLogo =
      commsConfig.logoVariant === "dark"
        ? commsConfig.logoDark || profile?.business_logo || commsConfig.logoLight || ""
        : profile?.business_logo || commsConfig.logoLight || commsConfig.logoDark || "";
    const selectedLogoUrl = normalizeLogoUrl(selectedRawLogo, Deno.env.get("SUPABASE_URL") || "");
    const header = getDefaultClientHeader(selectedLogoUrl || logoUrl, fromDisplayName, primaryColor);
    const footer = (profile?.client_email_footer_html || "").trim()
      ? replaceTokens(profile.client_email_footer_html, tokens)
      : getDefaultClientFooter(primaryColor, fromDisplayName, replyToEmail);
    const emailHtml = `${header}${coreHtml}${footer}${getLanceSignature(primaryColor)}`;

    const { data: emailData, error: emailError } = await resend.emails.send({
      from: `${fromDisplayName} <${RESEND_FROM_EMAIL}>`,
      to: [toEmail],
      subject: `Your client portal from ${fromDisplayName}`,
      html: emailHtml,
      ...(replyToEmail ? { reply_to: replyToEmail } : {}),
    });

    if (emailError) {
      console.error("send-client-portal-link Resend error:", emailError);
      return new Response(JSON.stringify({ error: `Failed to send email: ${emailError.message}` }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, messageId: emailData?.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    console.error("send-client-portal-link error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
