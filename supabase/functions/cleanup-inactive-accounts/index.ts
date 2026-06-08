// @ts-nocheck
// Daily cron: send deletion warnings (7+ days after trial end) and delete inactive accounts.
// Excludes is_lifetime and admin users. Requires RESEND_API_KEY and CLEANUP_CRON_KEY.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { format } from "https://esm.sh/date-fns@3.6.0/format";
import {
  buildLanceUserEmail,
  escapeHtml,
  getLanceFromAddress,
  LANCE_EMAIL_LOGO_BLACK_URL,
  LANCE_EMAIL_LOGO_WHITE_URL,
  LANCE_PRODUCT_NAME,
  loadLanceEmailComms,
} from "../_shared/lance-email.ts";
import { deleteUserAccount } from "../_shared/delete-user-account.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const RESEND_FROM_EMAIL = (Deno.env.get("RESEND_FROM_EMAIL") || "onboarding@resend.dev").trim();
const APP_BASE_URL = (Deno.env.get("APP_BASE_URL") || "").trim().replace(/\/$/, "");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, content-type",
};

type WarningCandidate = {
  user_id: string;
  email: string;
  full_name: string | null;
  trial_end_date: string;
  scheduled_deletion_at: string;
};

type DeletionCandidate = {
  user_id: string;
  email: string;
  full_name: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
};

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

  const authHeader = req.headers.get("Authorization") || req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Missing or invalid Authorization header" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const token = authHeader.replace("Bearer ", "");
  const cronKey = Deno.env.get("CLEANUP_CRON_KEY");

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
  const baseUrl = APP_BASE_URL || req.headers.get("origin") || "https://app.getlance.app";
  const billingUrl = `${baseUrl.replace(/\/$/, "")}/settings/subscription`;
  const lanceComms = await loadLanceEmailComms(supabase);
  const primaryColor = lanceComms.primaryColor;
  const logoUrl = LANCE_EMAIL_LOGO_WHITE_URL;

  let warningsSent = 0;
  let warningsFailed = 0;
  let accountsDeleted = 0;
  let deletionsFailed = 0;

  const { data: warningCandidates, error: warningError } = await supabase.rpc(
    "get_deletion_warning_candidates",
  );
  if (warningError) {
    console.error("get_deletion_warning_candidates error:", warningError);
    return new Response(JSON.stringify({ error: warningError.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  for (const row of (warningCandidates || []) as WarningCandidate[]) {
    const email = (row.email || "").trim();
    if (!email) continue;

    const name = (row.full_name || "there").trim() || "there";
    const deletionDate = row.scheduled_deletion_at
      ? format(new Date(row.scheduled_deletion_at), "MMMM d, yyyy")
      : "soon";
    const subject = `Your ${LANCE_PRODUCT_NAME} account will be deleted soon`;
    const body = `Hi ${name},

We will delete your ${LANCE_PRODUCT_NAME} account and all associated data in 7 days (${deletionDate}) unless you reactivate.

Your trial ended and we have not received payment details. If you want to keep your clients, projects, invoices, and contracts, add your payment details before ${deletionDate}.

Save my account: ${billingUrl}

Thanks,
The ${LANCE_PRODUCT_NAME} team`;

    const safeName = escapeHtml(name);
    const safeBilling = escapeHtml(billingUrl);
    const safeBody = escapeHtml(body).replace(/\n/g, "<br>");
    const contentHtml = `<h2 style="margin:0 0 12px;font-size:18px;color:${escapeHtml(primaryColor)};">${escapeHtml(subject)}</h2><p style="margin:0;color:#374151;">${safeBody}</p>
<p style="margin:16px 0 0;"><a href="${safeBilling}" style="display:inline-block;background:${escapeHtml(primaryColor)};color:#ffffff !important;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">Save my account</a></p>`;
    const html = buildLanceUserEmail(lanceComms, contentHtml, {
      user_name: safeName,
      billing_url: safeBilling,
      body_html: `<p>${safeBody}</p>`,
      primary_color: primaryColor,
      logo_url: logoUrl,
      logo_footer_url: LANCE_EMAIL_LOGO_BLACK_URL,
    }, email);

    const { error: sendError } = await resend.emails.send({
      from: getLanceFromAddress(),
      to: email,
      subject,
      text: body,
      html,
    });

    if (sendError) {
      console.error("Deletion warning send error:", sendError);
      warningsFailed++;
      continue;
    }

    const scheduledAt = row.scheduled_deletion_at || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        deletion_warning_sent: true,
        deletion_warning_sent_at: new Date().toISOString(),
        scheduled_deletion_at: scheduledAt,
      })
      .eq("user_id", row.user_id)
      .eq("is_lifetime", false);

    if (updateError) {
      console.error("Failed to mark deletion warning sent:", updateError);
      warningsFailed++;
    } else {
      warningsSent++;
    }
  }

  const { data: deletionCandidates, error: deletionError } = await supabase.rpc(
    "get_account_deletion_candidates",
  );
  if (deletionError) {
    console.error("get_account_deletion_candidates error:", deletionError);
    return new Response(
      JSON.stringify({
        warningsSent,
        warningsFailed,
        error: deletionError.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  for (const row of (deletionCandidates || []) as DeletionCandidate[]) {
    const result = await deleteUserAccount(supabase, {
      userId: row.user_id,
      email: row.email,
      name: row.full_name,
      stripeCustomerId: row.stripe_customer_id,
      stripeSubscriptionId: row.stripe_subscription_id,
      sendConfirmationEmail: true,
    });

    if (!result.ok) {
      console.error(`Failed to delete user ${row.user_id}:`, result.error);
      deletionsFailed++;
    } else {
      accountsDeleted++;
    }
  }

  return new Response(
    JSON.stringify({
      warningsSent,
      warningsFailed,
      warningCandidates: (warningCandidates || []).length,
      accountsDeleted,
      deletionsFailed,
      deletionCandidates: (deletionCandidates || []).length,
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
