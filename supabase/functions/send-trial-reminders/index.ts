// @ts-nocheck
// Supabase Edge Function: send trial reminder emails (e.g. 5 days left, 1 day left).
// Invoke via cron daily, or manually. Requires RESEND_API_KEY.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { Resend } from "https://esm.sh/resend@2.0.0";
import {
  buildLanceUserEmail,
  escapeHtml,
  getLanceFromAddress,
  LANCE_EMAIL_LOGO_BLACK_URL,
  LANCE_EMAIL_LOGO_WHITE_URL,
  LANCE_PRODUCT_NAME,
  loadLanceEmailComms,
} from "../_shared/lance-email.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const RESEND_FROM_EMAIL = (Deno.env.get("RESEND_FROM_EMAIL") || "onboarding@resend.dev").trim();
const APP_BASE_URL = (Deno.env.get("APP_BASE_URL") || "").trim().replace(/\/$/, "");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, content-type",
};

function getDaysUntil(endDate: string): number {
  const end = new Date(endDate);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  return Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  if (!Deno.env.get("RESEND_API_KEY")) {
    return new Response(JSON.stringify({ error: "RESEND_API_KEY not set" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (!RESEND_FROM_EMAIL || !RESEND_FROM_EMAIL.includes("@")) {
    return new Response(JSON.stringify({ error: "RESEND_FROM_EMAIL not set" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Auth: either a cron key (recommended) or an admin user's JWT.
  const authHeader = req.headers.get("Authorization") || req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Missing or invalid Authorization header" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const token = authHeader.replace("Bearer ", "");
  const cronKey = Deno.env.get("TRIAL_REMINDERS_CRON_KEY");

  if (!(cronKey && token === cronKey)) {
    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: { user } } = await userClient.auth.getUser(token);
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: profile } = await userClient.from("profiles").select("is_admin").eq("user_id", user.id).maybeSingle();
    if (!profile?.is_admin) {
      return new Response(JSON.stringify({ error: "Admin required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  // Optional test mode for deliverability checks without touching production trial dates.
  // Body: { testEmail?: string, testDaysLeft?: 3|1|0, testName?: string }
  let testBody: { testEmail?: string; testDaysLeft?: number; testName?: string } = {};
  try {
    const text = await req.text();
    if (text) testBody = JSON.parse(text);
  } catch {
    // ignore
  }

  const toSend: { email: string; name: string; daysLeft: number }[] = [];
  const testEmail = (testBody.testEmail || "").trim();
  if (testEmail) {
    const daysLeft = testBody.testDaysLeft === 3 || testBody.testDaysLeft === 1 || testBody.testDaysLeft === 0
      ? testBody.testDaysLeft
      : 3;
    toSend.push({ email: testEmail, name: (testBody.testName || "there").trim() || "there", daysLeft });
  } else {
    const { data: profiles, error } = await supabase
      .from("profiles")
      .select("user_id, email, full_name, trial_end_date")
      .eq("subscription_status", "trial")
      .eq("is_lifetime", false)
      .not("trial_end_date", "is", null);

    if (error) {
      console.error("Error fetching trial profiles:", error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Only profiles with subscription_status = 'trial' AND trial_end_date set are included.
    // Accounts created manually or before onboarding may have trial_end_date = null and won't get reminders until it's set.
    for (const p of profiles || []) {
      const trialEnd = p.trial_end_date as string | null;
      if (!trialEnd) continue;
      const email = (p.email as string) || "";
      if (!email) continue;
      const daysLeft = getDaysUntil(trialEnd);
      if (daysLeft === 3 || daysLeft === 1 || daysLeft === 0) {
        toSend.push({
          email,
          name: (p.full_name as string) || "there",
          daysLeft,
        });
      }
    }
  }

  const baseUrl = APP_BASE_URL || req.headers.get("origin") || "https://app.lance.com";
  const billingUrl = `${baseUrl}/settings/subscription`;
  const [{ data: comms }, lanceComms] = await Promise.all([
    supabase
      .from("app_comms_defaults")
      .select("trial_body_5d, trial_body_1d, trial_body_0d")
      .eq("id", 1)
      .maybeSingle(),
    loadLanceEmailComms(supabase),
  ]);
  const primaryColor = lanceComms.primaryColor;
  const logoUrl = LANCE_EMAIL_LOGO_WHITE_URL;

  let sent = 0;
  for (const { email, name, daysLeft } of toSend) {
    const subject =
      daysLeft === 3
        ? `Your ${LANCE_PRODUCT_NAME} trial ends in 3 days`
        : daysLeft === 1
          ? `Your ${LANCE_PRODUCT_NAME} trial ends tomorrow`
          : `Your ${LANCE_PRODUCT_NAME} trial ends today`;
    const fallbackBody =
      daysLeft === 3
        ? `Hi ${name},\n\nYour 15-day free trial ends in 3 days. Add your payment details to keep access to all your clients, projects, invoices, and contracts.\n\nAdd payment details: ${billingUrl}\n\nThanks,\nThe ${LANCE_PRODUCT_NAME} team`
        : daysLeft === 1
          ? `Hi ${name},\n\nYour free trial ends tomorrow. Add a payment method to keep access after your trial ends.\n\nAdd payment: ${billingUrl}\n\nThanks,\nThe ${LANCE_PRODUCT_NAME} team`
          : `Hi ${name},\n\nYour free trial ends today. Add a payment method to keep access to ${LANCE_PRODUCT_NAME}.\n\nAdd payment: ${billingUrl}\n\nThanks,\nThe ${LANCE_PRODUCT_NAME} team`;
    const customBody =
      daysLeft === 3
        ? (comms?.trial_body_5d as string | null)
        : daysLeft === 1
          ? (comms?.trial_body_1d as string | null)
          : (comms?.trial_body_0d as string | null);
    const body = (customBody && customBody.trim()) ? customBody : fallbackBody;
    const safeName = escapeHtml(name);
    const safeBilling = escapeHtml(billingUrl);
    const safeBody = escapeHtml(body).replace(/\n/g, "<br>");
    const tokens = {
      user_name: safeName,
      billing_url: safeBilling,
      body_html: `<p>${safeBody}</p>`,
      primary_color: primaryColor,
      logo_url: logoUrl,
      logo_footer_url: LANCE_EMAIL_LOGO_BLACK_URL,
    };
    const contentHtml = `<h2 style="margin:0 0 12px;font-size:18px;color:${escapeHtml(primaryColor)};">${escapeHtml(subject)}</h2><p style="margin:0;color:#374151;">${safeBody}</p>
<p style="margin:16px 0 0;"><a href="${safeBilling}" style="display:inline-block;background:${escapeHtml(primaryColor)};color:#ffffff !important;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">Manage subscription</a></p>`;
    const html = buildLanceUserEmail(lanceComms, contentHtml, tokens, email);

    const { error: sendError } = await resend.emails.send({
      from: getLanceFromAddress(),
      to: email,
      subject,
      text: body,
      html,
    });
    if (sendError) {
      console.error("Trial reminder send error:", sendError);
    } else {
      sent++;
    }
  }

  return new Response(
    JSON.stringify({ sent, total: toSend.length }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
