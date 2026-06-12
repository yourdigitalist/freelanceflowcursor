// @ts-nocheck
// Supabase Edge Function: send trial reminder emails (e.g. 5 days left, 1 day left).
// Invoke via cron daily, or manually. Requires RESEND_API_KEY.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { Resend } from "https://esm.sh/resend@2.0.0";
import {
  buildLanceUserEmail,
  buildTrialReminderEmail,
  getLanceFromAddress,
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

  const toSend: { email: string; fullName: string | null; daysLeft: number }[] = [];
  const testEmail = (testBody.testEmail || "").trim();
  if (testEmail) {
    const daysLeft = testBody.testDaysLeft === 3 || testBody.testDaysLeft === 1 || testBody.testDaysLeft === 0
      ? testBody.testDaysLeft
      : 3;
    toSend.push({ email: testEmail, fullName: (testBody.testName || "").trim() || null, daysLeft });
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
          fullName: (p.full_name as string) || null,
          daysLeft,
        });
      }
    }
  }

  const baseUrl = APP_BASE_URL || req.headers.get("origin") || "https://app.lance.com";
  const billingUrl = `${baseUrl}/settings/subscription`;
  const lanceComms = await loadLanceEmailComms(supabase);
  const primaryColor = lanceComms.primaryColor;

  let sent = 0;
  for (const { email, fullName, daysLeft } of toSend) {
    const trialEmail = buildTrialReminderEmail(
      daysLeft as 0 | 1 | 3,
      fullName,
      billingUrl,
      primaryColor,
    );
    const html = buildLanceUserEmail(lanceComms, trialEmail.contentHtml, {}, email);

    const { error: sendError } = await resend.emails.send({
      from: getLanceFromAddress(),
      to: email,
      subject: trialEmail.subject,
      text: trialEmail.text,
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
