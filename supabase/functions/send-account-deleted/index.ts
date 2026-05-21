// @ts-nocheck
// Sends "your account has been deleted" email. Used by delete-account and admin test mode.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { sendAccountDeletedEmail } from "../_shared/lance-email.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, content-type",
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

  const authHeader = req.headers.get("Authorization") || req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Missing or invalid Authorization header" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const token = authHeader.replace("Bearer ", "").trim();
  const serviceRoleKey = (Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "").trim();
  let isServiceRole = !!(serviceRoleKey && token === serviceRoleKey);
  if (!isServiceRole && token) {
    const probe = createClient(supabaseUrl, token);
    const { error: probeError } = await probe.auth.admin.listUsers({ page: 1, perPage: 1 });
    isServiceRole = !probeError;
  }

  let body: { testEmail?: string; testName?: string; email?: string; name?: string } = {};
  try {
    body = await req.json().catch(() => ({}));
  } catch {
    body = {};
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  let recipientEmail = "";
  let recipientName = "there";

  if (body.testEmail) {
    // Admin test mode (same auth pattern as send-trial-reminders).
    if (!isServiceRole) {
      const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
      const { data: { user } } = await userClient.auth.getUser(token);
      if (!user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: profile } = await userClient
        .from("profiles")
        .select("is_admin")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!profile?.is_admin) {
        return new Response(JSON.stringify({ error: "Admin required" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }
    recipientEmail = body.testEmail.trim();
    recipientName = (body.testName || "there").trim() || "there";
  } else if (isServiceRole && body.email) {
    // Internal call from delete-account (service role + explicit email).
    recipientEmail = body.email.trim();
    recipientName = (body.name || "there").trim() || "there";
  } else {
    return new Response(
      JSON.stringify({ error: "Use testEmail (admin test) or email+name with service role" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const result = await sendAccountDeletedEmail(supabase, {
    email: recipientEmail,
    name: recipientName,
  });

  if (!result.ok) {
    return new Response(JSON.stringify({ error: result.error || "Failed to send" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ sent: 1, testMode: !!body.testEmail }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
