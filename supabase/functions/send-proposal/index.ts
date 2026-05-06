import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { Resend } from "https://esm.sh/resend@2.0.0";

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

function getDefaultClientHeader(logoUrl: string, businessName: string, primaryColor: string): string {
  return `<div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
  <div style="padding: 18px 20px; background: ${primaryColor}; color: white;">
    ${logoUrl ? `<img src="${logoUrl}" alt="${escapeHtml(businessName)}" style="height: 28px; max-width: 160px; object-fit: contain;" />` : `<strong style="font-size: 18px;">${escapeHtml(businessName)}</strong>`}
  </div>
  <div style="padding: 20px;">`;
}

function getDefaultClientFooter(primaryColor: string): string {
  return `</div><div style="padding: 14px 20px; font-size: 12px; color: #6b7280; border-top: 1px solid #e5e7eb;">
  Sent by <span style="color: ${primaryColor}; font-weight: 600;">Lance</span>
</div></div>`;
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

    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { proposalId, origin } = await req.json();
    if (!proposalId) {
      return new Response(JSON.stringify({ error: "Missing proposalId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: proposal, error: proposalError } = await supabase
      .from("proposals")
      .select("id, identifier, public_token, objective, presentation, total, client_id")
      .eq("id", proposalId)
      .eq("user_id", user.id)
      .single();

    if (proposalError || !proposal) {
      return new Response(JSON.stringify({ error: "Proposal not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select("name, email")
      .eq("id", proposal.client_id)
      .single();
    if (clientError || !client?.email) {
      return new Response(JSON.stringify({ error: "Client email not found" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, business_name, business_email, email, business_logo, client_email_primary_color, client_email_header_html, client_email_footer_html")
      .eq("user_id", user.id)
      .maybeSingle();

    const baseUrlFromRequest = (origin && typeof origin === "string") ? origin.trim().replace(/\/$/, "") : "";
    const baseUrl = baseUrlFromRequest || APP_BASE_URL || "https://app.example.com";
    const proposalUrl = `${baseUrl}/proposal/${proposal.public_token}`;

    const primaryColor = (profile?.client_email_primary_color || "#9B63E9").trim();
    const fromDisplayName = (profile?.business_name || profile?.full_name || "Your Business").trim();
    const replyToEmail = (profile?.business_email || profile?.email || "").trim();
    const rawLogo = (profile?.business_logo || "").trim();
    const logoUrl = rawLogo
      ? rawLogo.startsWith("http://") || rawLogo.startsWith("https://")
        ? rawLogo
        : `${(Deno.env.get("SUPABASE_URL") || "").replace(/\/$/, "")}${rawLogo.startsWith("/") ? rawLogo : `/${rawLogo}`}`
      : "";

    const coreHtml = `
      <h2 style="color: ${primaryColor}; margin-top: 0;">Proposal ${escapeHtml(proposal.identifier)}</h2>
      <p style="color: #333;">Hi ${escapeHtml(client.name)}, your proposal is ready for review.</p>
      <p style="margin: 24px 0;">
        <a href="${escapeHtml(proposalUrl)}" style="display: inline-block; background: ${primaryColor}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px;">Open proposal</a>
      </p>
      <p style="color: #666;">${escapeHtml(proposal.presentation || "")}</p>
      <p style="color: #666;">${escapeHtml(proposal.objective || "")}</p>
      <p style="color: #999; font-size: 12px;">Or copy this link: ${escapeHtml(proposalUrl)}</p>
    `;

    const tokens = {
      business_name: escapeHtml(fromDisplayName),
      logo_url: logoUrl,
      primary_color: primaryColor,
      body_html: coreHtml,
      proposal_id: escapeHtml(proposal.identifier),
      proposal_url: escapeHtml(proposalUrl),
    };
    const header = (profile?.client_email_header_html || "").trim()
      ? replaceTokens(profile.client_email_header_html, tokens)
      : getDefaultClientHeader(logoUrl, fromDisplayName, primaryColor);
    const footer = (profile?.client_email_footer_html || "").trim()
      ? replaceTokens(profile.client_email_footer_html, tokens)
      : getDefaultClientFooter(primaryColor);
    const emailHtml = `${header}${coreHtml}${footer}`;

    const { data: emailData, error: emailError } = await resend.emails.send({
      from: `${fromDisplayName} <${RESEND_FROM_EMAIL}>`,
      to: [client.email],
      subject: `Proposal ${proposal.identifier} from ${fromDisplayName}`,
      html: emailHtml,
      ...(replyToEmail ? { reply_to: replyToEmail } : {}),
    });

    if (emailError) {
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
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
