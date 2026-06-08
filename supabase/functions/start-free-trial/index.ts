// @ts-nocheck
// Start a 15-day Stripe trial without collecting a payment method.
// At trial end, Stripe pauses the subscription until a card is added.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import Stripe from "https://esm.sh/stripe@14.21.0?target=denonext";
import {
  promotionCodeFromSubscription,
  SUBSCRIPTION_DISCOUNT_EXPANDS,
} from "../_shared/stripe-promotion-code.ts";
import { mapStripeSubscriptionStatus } from "../_shared/stripe-subscription-status.ts";

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

  let body: { priceId?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const priceId = body.priceId;
  if (!priceId || typeof priceId !== "string") {
    return new Response(JSON.stringify({ error: "Missing priceId" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "email, is_lifetime, onboarding_completed, subscription_status, stripe_customer_id, stripe_subscription_id",
    )
    .eq("user_id", user.id)
    .maybeSingle();

  if (profile?.is_lifetime === true) {
    return new Response(JSON.stringify({ error: "Billing not required for this account" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const stripe = new Stripe(stripeSecret);
  const existingStatus = (profile?.subscription_status ?? "").toLowerCase();
  if (
    profile?.stripe_subscription_id &&
    (existingStatus === "trial" || existingStatus === "active")
  ) {
    await supabase
      .from("profiles")
      .update({ onboarding_completed: true })
      .eq("user_id", user.id);
    return new Response(JSON.stringify({ ok: true, already_subscribed: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const customerEmail = (profile?.email as string) || user.email || undefined;
  let customerId = profile?.stripe_customer_id as string | null;

  try {
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: customerEmail,
        metadata: { user_id: user.id },
      });
      customerId = customer.id;
    }

    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      trial_period_days: 15,
      payment_settings: {
        save_default_payment_method: "off",
      },
      trial_settings: {
        end_behavior: {
          missing_payment_method: "pause",
        },
      },
      metadata: { user_id: user.id },
    });

    const sub = await stripe.subscriptions.retrieve(subscription.id, {
      expand: [...SUBSCRIPTION_DISCOUNT_EXPANDS],
    });
    const promotionCode = promotionCodeFromSubscription(sub);
    const price = sub.items.data[0]?.price;
    const planType = price?.recurring?.interval === "year" ? "pro_annual" : "pro_monthly";
    const trialStart = sub.trial_start ? new Date(sub.trial_start * 1000).toISOString() : null;
    const trialEnd = sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null;

    await supabase
      .from("profiles")
      .update({
        onboarding_completed: true,
        subscription_status: mapStripeSubscriptionStatus(sub.status),
        plan_type: planType,
        stripe_customer_id: customerId,
        stripe_subscription_id: sub.id,
        trial_start_date: trialStart,
        trial_end_date: trialEnd,
        ...(promotionCode ? { stripe_promotion_code: promotionCode } : {}),
      })
      .eq("user_id", user.id);

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    let message = "Stripe error";
    if (err && typeof err === "object" && "message" in err && typeof (err as { message: string }).message === "string") {
      message = (err as { message: string }).message;
    } else if (err instanceof Error) {
      message = err.message;
    }
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
