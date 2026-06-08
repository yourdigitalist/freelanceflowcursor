import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { deleteUserAccount } from "../_shared/delete-user-account.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
      return new Response(JSON.stringify({ error: "Missing Supabase environment variables" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: authData, error: authError } = await authClient.auth.getUser();
    const userId = authData.user?.id;
    const authEmail = authData.user?.email?.trim() || "";

    if (authError || !userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey);

    const { data: profile } = await adminClient
      .from("profiles")
      .select("email, full_name, first_name, last_name, stripe_customer_id, stripe_subscription_id")
      .eq("user_id", userId)
      .maybeSingle();

    const profileEmail = (profile?.email as string | null)?.trim() || "";
    const recipientEmail = profileEmail || authEmail;
    if (!recipientEmail) {
      return new Response(JSON.stringify({ error: "No email on file for this account" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const first = (profile?.first_name as string | null)?.trim() || "";
    const last = (profile?.last_name as string | null)?.trim() || "";
    const combined = `${first} ${last}`.trim();
    const recipientName =
      combined ||
      (profile?.full_name as string | null)?.trim() ||
      recipientEmail.split("@")[0] ||
      "there";

    const result = await deleteUserAccount(adminClient, {
      userId,
      email: recipientEmail,
      name: recipientName,
      stripeCustomerId: profile?.stripe_customer_id as string | null,
      stripeSubscriptionId: profile?.stripe_subscription_id as string | null,
      sendConfirmationEmail: true,
    });

    if (!result.ok) {
      return new Response(JSON.stringify({ error: result.error || "Failed to delete account" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, emailSent: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
