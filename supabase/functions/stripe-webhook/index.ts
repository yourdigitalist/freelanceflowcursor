// @ts-nocheck
// Supabase Edge Function (Deno): Stripe webhook. Sync subscription status to profiles.
// Set STRIPE_WEBHOOK_SECRET and point Stripe Dashboard webhook to this function URL.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import Stripe from "https://esm.sh/stripe@14.21.0?target=denonext";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, content-type, stripe-signature",
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

  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET not set");
    return new Response(JSON.stringify({ error: "Webhook not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return new Response(JSON.stringify({ error: "Missing stripe-signature" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const rawBody = await req.text();
  const stripeSecret = Deno.env.get("STRIPE_SECRET_KEY");
  if (!stripeSecret) {
    return new Response(JSON.stringify({ error: "Stripe not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const stripe = new Stripe(stripeSecret);

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Invalid signature";
    console.error("Stripe webhook signature verification failed:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = (session.client_reference_id || session.metadata?.user_id) as string | null;
        if (!userId) {
          console.warn("checkout.session.completed: no user_id in session");
          break;
        }
        const subscriptionId = session.subscription as string | null;
        const customerId = session.customer as string | null;
        let planType = "pro_monthly";
        let subscriptionStatus = "active";
        let trialStart: string | null = null;
        let trialEnd: string | null = null;
        if (subscriptionId) {
          const sub = await stripe.subscriptions.retrieve(subscriptionId);
          const priceId = sub.items.data[0]?.price?.id;
          if (priceId) {
            const price = await stripe.prices.retrieve(priceId);
            planType = price.recurring?.interval === "year" ? "pro_annual" : "pro_monthly";
          }
          if (sub.status === "trialing") {
            subscriptionStatus = "trial";
          }
          trialStart = sub.trial_start ? new Date(sub.trial_start * 1000).toISOString() : null;
          trialEnd = sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null;
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
            .eq("user_id", userId);
        } else {
          await supabase
            .from("profiles")
            .update({
              onboarding_completed: true,
              subscription_status: subscriptionStatus,
              plan_type: planType,
              stripe_customer_id: customerId,
              stripe_subscription_id: subscriptionId,
            })
            .eq("user_id", userId);
        }
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = sub.customer as string;
        const { data: profile } = await supabase
          .from("profiles")
          .select("user_id")
          .eq("stripe_customer_id", customerId)
          .maybeSingle();
        if (!profile?.user_id) break;

        const status = sub.status;
        const planType =
          sub.items.data[0]?.price?.recurring?.interval === "year" ? "pro_annual" : "pro_monthly";
        const subscriptionStatus =
          status === "trialing"
            ? "trial"
            : status === "active"
              ? "active"
              : status === "past_due"
                ? "past_due"
                : "canceled";
        const trialEnd = sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null;
        const trialStart = sub.trial_start ? new Date(sub.trial_start * 1000).toISOString() : null;

        await supabase
          .from("profiles")
          .update({
            subscription_status: subscriptionStatus,
            plan_type: planType,
            trial_end_date: trialEnd,
            ...(trialStart && { trial_start_date: trialStart }),
          })
          .eq("user_id", profile.user_id);
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = sub.customer as string;
        const { data: profile } = await supabase
          .from("profiles")
          .select("user_id")
          .eq("stripe_customer_id", customerId)
          .maybeSingle();
        if (!profile?.user_id) break;

        await supabase
          .from("profiles")
          .update({
            subscription_status: "canceled",
            stripe_subscription_id: null,
          })
          .eq("user_id", profile.user_id);
        break;
      }

      default:
        // Unhandled event type
        break;
    }
  } catch (err) {
    console.error("Webhook handler error:", err);
    return new Response(JSON.stringify({ error: "Webhook handler failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
