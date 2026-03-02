// @ts-nocheck
// Supabase Edge Function (Deno): create Stripe Customer Portal session (manage subscription, payment method).
// Requires: STRIPE_SECRET_KEY. User must have stripe_customer_id set (after at least one checkout).
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import Stripe from "https://esm.sh/stripe@14.21.0?target=denonext";

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

  const stripeSecret = Deno.env.get("STRIPE_SECRET_KEY")?.trim();
  if (!stripeSecret) {
    return new Response(JSON.stringify({ error: "Stripe not configured" }), {
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
  const anonKey = req.headers.get("apikey") || Deno.env.get("SUPABASE_ANON_KEY") || "";
  const supabaseAuth = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
  if (authError || !user) {
    const message = authError?.message?.includes("JWT") ? authError.message : "Unauthorized";
    return new Response(JSON.stringify({ error: message }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  let body: { returnUrl?: string };
  try {
    body = await req.json().catch(() => ({}));
  } catch {
    body = {};
  }

  const origin = req.headers.get("origin") || req.headers.get("referer")?.replace(/\/$/, "") || "https://localhost";
  const baseUrl = typeof origin === "string" ? origin.replace(/\/$/, "") : "https://localhost";
  const returnUrl = body.returnUrl || `${baseUrl}/settings/subscription`;

  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_customer_id, stripe_subscription_id, subscription_status")
    .eq("user_id", user.id)
    .maybeSingle();

  let customerId = profile?.stripe_customer_id as string | null;

  const stripe = new Stripe(stripeSecret);

  // If user is on trial/active but profile has no stripe_customer_id (e.g. return from checkout was missed), try to recover from Stripe by email
  if (!customerId && (profile?.subscription_status === "trial" || profile?.subscription_status === "active")) {
    const email = user.email?.trim();
    if (email) {
      const customers = await stripe.customers.list({ email, limit: 1 });
      const customer = customers.data[0];
      if (customer?.id) {
        customerId = customer.id;
        await supabase
          .from("profiles")
          .update({ stripe_customer_id: customerId })
          .eq("user_id", user.id);
      }
    }
  }

  if (!customerId) {
    const isTrial = profile?.subscription_status === "trial";
    const message = isTrial
      ? "No billing account found. Add a payment method by choosing a plan above and completing checkout—then you can open the billing portal to manage or cancel."
      : "No billing account found. Subscribe to a plan first.";
    return new Response(
      JSON.stringify({ error: message }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  try {
    const subscriptionId = profile?.stripe_subscription_id as string | null;
    const params: {
      customer: string;
      return_url: string;
      flow_data?: {
        type: "subscription_update";
        subscription_update: { subscription: string };
        after_completion: { type: "redirect"; redirect: { return_url: string } };
      };
    } = {
      customer: customerId,
      return_url: returnUrl,
    };
    // If user has a subscription, open portal directly to "update subscription" for that subscription
    // so Stripe shows only the current plan as selected (not both monthly and yearly).
    if (subscriptionId?.startsWith("sub_")) {
      params.flow_data = {
        type: "subscription_update",
        subscription_update: { subscription: subscriptionId },
        after_completion: { type: "redirect", redirect: { return_url: returnUrl } },
      };
    }
    const session = await stripe.billingPortal.sessions.create(params);

    return new Response(JSON.stringify({ url: session.url }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Stripe error";
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
