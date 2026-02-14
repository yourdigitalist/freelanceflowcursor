// @ts-nocheck
// Supabase Edge Function: after Stripe Checkout success, set onboarding_completed and subscription
// so the user can access the app even if the webhook hasn't run yet.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import Stripe from "https://esm.sh/stripe@14.21.0?target=denonext";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
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
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  let body: { session_id?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const sessionId = body.session_id;
  if (!sessionId || typeof sessionId !== "string") {
    return new Response(JSON.stringify({ error: "Missing session_id" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const stripe = new Stripe(stripeSecret);

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["subscription"],
    });

    const userId = (session.client_reference_id || session.metadata?.user_id) as string | null;
    if (!userId || userId !== user.id) {
      return new Response(JSON.stringify({ error: "Session does not match user" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (session.status !== "complete") {
      return new Response(JSON.stringify({ error: "Checkout not complete" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const subscriptionId = session.subscription as string | null;
    const customerId = session.customer as string | null;
    let planType = "pro_monthly";
    let subscriptionStatus = "trial";
    let trialStart: string | null = null;
    let trialEnd: string | null = null;

    if (subscriptionId && typeof subscriptionId === "string") {
      const sub = await stripe.subscriptions.retrieve(subscriptionId);
      const priceId = sub.items.data[0]?.price?.id;
      if (priceId) {
        const price = await stripe.prices.retrieve(priceId);
        planType = price.recurring?.interval === "year" ? "pro_annual" : "pro_monthly";
      }
      if (sub.status === "trialing") {
        subscriptionStatus = "trial";
      } else if (sub.status === "active") {
        subscriptionStatus = "active";
      }
      trialStart = sub.trial_start ? new Date(sub.trial_start * 1000).toISOString() : null;
      trialEnd = sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null;
    }

    await supabase
      .from("profiles")
      .update({
        onboarding_completed: true,
        subscription_status: subscriptionStatus,
        plan_type: planType,
        stripe_customer_id: customerId,
        stripe_subscription_id: subscriptionId,
        trial_start_date: trialStart,
        trial_end_date: trialEnd,
      })
      .eq("user_id", user.id);

    return new Response(JSON.stringify({ ok: true }), {
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
