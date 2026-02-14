// @ts-nocheck
// Supabase Edge Function: send trial reminder emails (e.g. 5 days left, 1 day left).
// Invoke via cron daily, or manually. Requires RESEND_API_KEY.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

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

  if (!Deno.env.get("RESEND_API_KEY")) {
    return new Response(JSON.stringify({ error: "RESEND_API_KEY not set" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("user_id, email, full_name, trial_end_date")
    .eq("subscription_status", "trial")
    .not("trial_end_date", "is", null);

  if (error) {
    console.error("Error fetching trial profiles:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const toSend: { email: string; name: string; daysLeft: number }[] = [];
  for (const p of profiles || []) {
    const trialEnd = p.trial_end_date as string | null;
    if (!trialEnd) continue;
    const email = (p.email as string) || "";
    if (!email) continue;
    const daysLeft = getDaysUntil(trialEnd);
    if (daysLeft === 5 || daysLeft === 1) {
      toSend.push({
        email,
        name: (p.full_name as string) || "there",
        daysLeft,
      });
    }
  }

  let sent = 0;
  for (const { email, name, daysLeft } of toSend) {
    const subject =
      daysLeft === 5
        ? "Your FreelanceFlow trial ends in 5 days"
        : "Your FreelanceFlow trial ends tomorrow";
    const body =
      daysLeft === 5
        ? `Hi ${name},\n\nYour 15-day free trial ends in 5 days. You'll keep full access until then, and we'll charge your card on the trial end date unless you cancel.\n\nManage your subscription: ${req.headers.get("origin") || "https://app.freelanceflow.com"}/settings/subscription\n\nThanks,\nThe FreelanceFlow team`
        : `Hi ${name},\n\nYour free trial ends tomorrow. Your card will be charged automatically to continue your subscription.\n\nTo cancel or update payment: ${req.headers.get("origin") || "https://app.freelanceflow.com"}/settings/subscription\n\nThanks,\nThe FreelanceFlow team`;

    const { error: sendError } = await resend.emails.send({
      from: "FreelanceFlow <onboarding@resend.dev>",
      to: email,
      subject,
      text: body,
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
