// @ts-nocheck
// Create Stripe Connect Standard Account Link (TEST MODE ONLY via STRIPE_CONNECT_SECRET_KEY).
// Requires fee acknowledgment before enabling. Isolated from Lance SaaS STRIPE_SECRET_KEY.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { appBaseUrl, getConnectStripe } from "../_shared/stripe-connect.ts";

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

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = req.headers.get("apikey") || Deno.env.get("SUPABASE_ANON_KEY") || "";
    const supabaseAuth = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let body: { feesAcknowledged?: boolean; refresh?: boolean; syncOnly?: boolean } = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select(
        "email, business_email, business_country, stripe_connect_account_id, stripe_connect_fees_acknowledged_at, stripe_connect_charges_enabled, stripe_connect_details_submitted",
      )
      .eq("user_id", user.id)
      .maybeSingle();

    if (profileError) throw profileError;

    const stripe = getConnectStripe();
    let accountId = profile?.stripe_connect_account_id as string | null;

    // Return / refresh from Stripe: sync charges_enabled without requiring a new fee checkbox.
    if (body.syncOnly === true) {
      if (!accountId) {
        return new Response(JSON.stringify({ error: "No Connect account linked" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const account = await stripe.accounts.retrieve(accountId);
      const chargesEnabled = Boolean(account.charges_enabled);
      const detailsSubmitted = Boolean(account.details_submitted);
      await supabase
        .from("profiles")
        .update({
          stripe_connect_charges_enabled: chargesEnabled,
          stripe_connect_details_submitted: detailsSubmitted,
        })
        .eq("user_id", user.id);
      return new Response(
        JSON.stringify({
          accountId,
          chargesEnabled,
          detailsSubmitted,
          ready: chargesEnabled && detailsSubmitted && Boolean(profile?.stripe_connect_fees_acknowledged_at),
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const alreadyAcked = Boolean(profile?.stripe_connect_fees_acknowledged_at);
    if (!alreadyAcked && body.feesAcknowledged !== true) {
      return new Response(
        JSON.stringify({
          error:
            "You must acknowledge that Stripe (not Lance) charges payment processing fees before connecting.",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const base = appBaseUrl(req);
    const returnUrl = `${base}/settings/payments?connect=return`;
    const refreshUrl = `${base}/settings/payments?connect=refresh`;

    if (!accountId) {
      const countryRaw = (profile?.business_country || "").trim();
      const country = countryRaw.length === 2 ? countryRaw.toUpperCase() : undefined;
      const email = (profile?.business_email || profile?.email || user.email || "").trim() || undefined;

      const account = await stripe.accounts.create({
        type: "standard",
        ...(country ? { country } : {}),
        ...(email ? { email } : {}),
        metadata: {
          lance_user_id: user.id,
          lance_purpose: "invoice_collection",
        },
      });
      accountId = account.id;

      const now = new Date().toISOString();
      const { error: saveErr } = await supabase
        .from("profiles")
        .update({
          stripe_connect_account_id: accountId,
          stripe_connect_fees_acknowledged_at: alreadyAcked
            ? profile.stripe_connect_fees_acknowledged_at
            : now,
          stripe_connect_connected_at: now,
          stripe_connect_charges_enabled: false,
          stripe_connect_details_submitted: false,
        })
        .eq("user_id", user.id);
      if (saveErr) throw saveErr;
    } else if (!alreadyAcked && body.feesAcknowledged === true) {
      await supabase
        .from("profiles")
        .update({ stripe_connect_fees_acknowledged_at: new Date().toISOString() })
        .eq("user_id", user.id);
    }

    try {
      const account = await stripe.accounts.retrieve(accountId!);
      await supabase
        .from("profiles")
        .update({
          stripe_connect_charges_enabled: Boolean(account.charges_enabled),
          stripe_connect_details_submitted: Boolean(account.details_submitted),
        })
        .eq("user_id", user.id);
    } catch (e) {
      console.warn("Could not retrieve Connect account:", e);
    }

    const accountLink = await stripe.accountLinks.create({
      account: accountId!,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: "account_onboarding",
    });

    return new Response(JSON.stringify({ url: accountLink.url, accountId }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("create-connect-account-link:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
