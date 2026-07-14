// @ts-nocheck
// Daily cron: 3-stage deletion warnings, soft-delete inactive accounts, permanent delete after restore window.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { format, differenceInCalendarDays } from "https://esm.sh/date-fns@3.6.0";
import { LANCE_PRODUCT_NAME } from "../_shared/lance-email.ts";
import {
  generateDeletionExportToken,
  sendDeletionWarningEmail,
  softDeleteUserAccount,
} from "../_shared/account-deletion.ts";
import { deleteUserAccount } from "../_shared/delete-user-account.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const RESEND_FROM_EMAIL = (Deno.env.get("RESEND_FROM_EMAIL") || "onboarding@resend.dev").trim();

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, content-type",
};

type WarningCandidate = {
  user_id: string;
  email: string;
  full_name: string | null;
  scheduled_deletion_at: string;
};

type ReminderCandidate = {
  user_id: string;
  email: string;
  full_name: string | null;
  scheduled_deletion_at: string;
  deletion_export_token: string | null;
};

type DeletionCandidate = {
  user_id: string;
  email: string;
  full_name: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  deletion_export_token: string | null;
};

type PermanentDeletionCandidate = {
  user_id: string;
  email: string;
  full_name: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
};

async function authorizeCronOrAdmin(req: Request, supabaseUrl: string, anonKey: string) {
  const authHeader = req.headers.get("Authorization") || req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return false;
  const token = authHeader.replace("Bearer ", "");
  const cronKey = Deno.env.get("CLEANUP_CRON_KEY");
  if (cronKey && token === cronKey) return true;

  const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
  const { data: { user } } = await userClient.auth.getUser(token);
  if (!user) return false;
  const { data: profile } = await userClient.from("profiles").select("is_admin").eq("user_id", user.id).maybeSingle();
  return profile?.is_admin === true;
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

  const authorized = await authorizeCronOrAdmin(req, supabaseUrl, anonKey);
  if (!authorized) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  let initialWarningsSent = 0;
  let reminder3dSent = 0;
  let reminder1dSent = 0;
  let accountsSoftDeleted = 0;
  let permanentDeletions = 0;
  let failures = 0;

  const { data: warningCandidates, error: warningError } = await supabase.rpc("get_deletion_warning_candidates");
  if (warningError) {
    return new Response(JSON.stringify({ error: warningError.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  for (const row of (warningCandidates || []) as WarningCandidate[]) {
    const email = (row.email || "").trim();
    if (!email) continue;

    const scheduledAt = row.scheduled_deletion_at || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const deletionDate = format(new Date(scheduledAt), "MMMM d, yyyy");
    const exportToken = generateDeletionExportToken();

    const sendResult = await sendDeletionWarningEmail(supabase, resend, {
      to: email,
      stage: "initial",
      name: row.full_name || email.split("@")[0],
      deletionDateLabel: deletionDate,
      daysLeft: 7,
      exportToken,
    });

    if (!sendResult.ok) {
      console.error("Initial deletion warning failed:", sendResult.error);
      failures++;
      continue;
    }

    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        deletion_warning_sent: true,
        deletion_warning_sent_at: new Date().toISOString(),
        scheduled_deletion_at: scheduledAt,
        deletion_export_token: exportToken,
      })
      .eq("user_id", row.user_id)
      .eq("is_lifetime", false);

    if (updateError) {
      console.error("Failed to mark initial warning:", updateError);
      failures++;
    } else {
      initialWarningsSent++;
    }
  }

  const { data: reminder3dCandidates, error: reminder3dError } = await supabase.rpc("get_deletion_reminder_3d_candidates");
  if (reminder3dError) {
    console.error("get_deletion_reminder_3d_candidates:", reminder3dError);
  } else {
    for (const row of (reminder3dCandidates || []) as ReminderCandidate[]) {
      const email = (row.email || "").trim();
      if (!email || !row.scheduled_deletion_at) continue;

      const deletionDate = format(new Date(row.scheduled_deletion_at), "MMMM d, yyyy");
      const daysLeft = Math.max(1, differenceInCalendarDays(new Date(row.scheduled_deletion_at), new Date()));

      const sendResult = await sendDeletionWarningEmail(supabase, resend, {
        to: email,
        stage: "3d",
        name: row.full_name || email.split("@")[0],
        deletionDateLabel: deletionDate,
        daysLeft,
        exportToken: row.deletion_export_token,
      });

      if (!sendResult.ok) {
        failures++;
        continue;
      }

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ deletion_reminder_3d_sent_at: new Date().toISOString() })
        .eq("user_id", row.user_id);

      if (updateError) failures++;
      else reminder3dSent++;
    }
  }

  const { data: reminder1dCandidates, error: reminder1dError } = await supabase.rpc("get_deletion_reminder_1d_candidates");
  if (reminder1dError) {
    console.error("get_deletion_reminder_1d_candidates:", reminder1dError);
  } else {
    for (const row of (reminder1dCandidates || []) as ReminderCandidate[]) {
      const email = (row.email || "").trim();
      if (!email || !row.scheduled_deletion_at) continue;

      const deletionDate = format(new Date(row.scheduled_deletion_at), "MMMM d, yyyy");
      const daysLeft = Math.max(1, differenceInCalendarDays(new Date(row.scheduled_deletion_at), new Date()));

      const sendResult = await sendDeletionWarningEmail(supabase, resend, {
        to: email,
        stage: "1d",
        name: row.full_name || email.split("@")[0],
        deletionDateLabel: deletionDate,
        daysLeft,
        exportToken: row.deletion_export_token,
      });

      if (!sendResult.ok) {
        failures++;
        continue;
      }

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ deletion_reminder_1d_sent_at: new Date().toISOString() })
        .eq("user_id", row.user_id);

      if (updateError) failures++;
      else reminder1dSent++;
    }
  }

  const { data: deletionCandidates, error: deletionError } = await supabase.rpc("get_account_deletion_candidates");
  if (deletionError) {
    console.error("get_account_deletion_candidates:", deletionError);
  } else {
    for (const row of (deletionCandidates || []) as DeletionCandidate[]) {
      const result = await softDeleteUserAccount(supabase, resend, {
        userId: row.user_id,
        email: row.email,
        name: row.full_name,
        stripeCustomerId: row.stripe_customer_id,
        stripeSubscriptionId: row.stripe_subscription_id,
      });

      if (!result.ok) {
        console.error(`Soft delete failed ${row.user_id}:`, result.error);
        failures++;
      } else {
        accountsSoftDeleted++;
      }
    }
  }

  const { data: permanentCandidates, error: permanentError } = await supabase.rpc("get_permanent_deletion_candidates");
  if (permanentError) {
    console.error("get_permanent_deletion_candidates:", permanentError);
  } else {
    for (const row of (permanentCandidates || []) as PermanentDeletionCandidate[]) {
      const result = await deleteUserAccount(supabase, {
        userId: row.user_id,
        email: row.email,
        name: row.full_name,
        stripeCustomerId: row.stripe_customer_id,
        stripeSubscriptionId: row.stripe_subscription_id,
        sendConfirmationEmail: true,
      });

      if (!result.ok) {
        console.error(`Permanent delete failed ${row.user_id}:`, result.error);
        failures++;
      } else {
        permanentDeletions++;
      }
    }
  }

  return new Response(
    JSON.stringify({
      initialWarningsSent,
      reminder3dSent,
      reminder1dSent,
      accountsSoftDeleted,
      permanentDeletions,
      failures,
      warningCandidates: (warningCandidates || []).length,
      reminder3dCandidates: (reminder3dCandidates || []).length,
      reminder1dCandidates: (reminder1dCandidates || []).length,
      deletionCandidates: (deletionCandidates || []).length,
      permanentCandidates: (permanentCandidates || []).length,
      product: LANCE_PRODUCT_NAME,
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
