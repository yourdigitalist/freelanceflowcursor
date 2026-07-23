// @ts-nocheck
// Stripe Connect webhook (TEST MODE). Uses STRIPE_CONNECT_* secrets only — never SaaS billing keys.
// Point a Stripe *test* webhook (including Connected account events) at this function.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import Stripe from "https://esm.sh/stripe@14.21.0?target=denonext";
import { markInvoicePaidFromStripe } from "../_shared/stripe-connect.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, content-type, stripe-signature",
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

  const webhookSecret = Deno.env.get("STRIPE_CONNECT_WEBHOOK_SECRET")?.trim();
  const stripeSecret = Deno.env.get("STRIPE_CONNECT_SECRET_KEY")?.trim();
  if (!webhookSecret || !stripeSecret) {
    console.error("STRIPE_CONNECT_WEBHOOK_SECRET or STRIPE_CONNECT_SECRET_KEY not set");
    return new Response(JSON.stringify({ error: "Connect webhook not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (!stripeSecret.startsWith("sk_test_")) {
    console.error("Refusing Connect webhook: STRIPE_CONNECT_SECRET_KEY is not a test key");
    return new Response(JSON.stringify({ error: "Connect must use test keys" }), {
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
  const stripe = new Stripe(stripeSecret, { apiVersion: "2023-10-16" });

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(rawBody, signature, webhookSecret);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Invalid signature";
    console.error("Connect webhook signature failed:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Ignore anything that isn't invoice collection (safety if misconfigured)
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.metadata?.lance_purpose !== "invoice_payment") {
          console.log("Ignoring checkout.session.completed without lance_purpose=invoice_payment");
          break;
        }
        const invoiceId = session.metadata?.invoice_id;
        if (!invoiceId) {
          console.warn("Connect checkout.session.completed missing invoice_id");
          break;
        }
        const pi = typeof session.payment_intent === "string"
          ? session.payment_intent
          : session.payment_intent?.id || null;
        await markInvoicePaidFromStripe(supabase, invoiceId, pi);
        break;
      }
      case "account.updated": {
        const account = event.data.object as Stripe.Account;
        await supabase
          .from("profiles")
          .update({
            stripe_connect_charges_enabled: Boolean(account.charges_enabled),
            stripe_connect_details_submitted: Boolean(account.details_submitted),
          })
          .eq("stripe_connect_account_id", account.id);
        break;
      }
      case "account.application.deauthorized": {
        const accountId = (event.account || (event.data.object as { id?: string })?.id) as string | undefined;
        if (accountId) {
          await supabase
            .from("profiles")
            .update({
              stripe_connect_account_id: null,
              stripe_connect_charges_enabled: false,
              stripe_connect_details_submitted: false,
              stripe_connect_fees_acknowledged_at: null,
              stripe_connect_connected_at: null,
            })
            .eq("stripe_connect_account_id", accountId);
        }
        break;
      }
      default:
        break;
    }
  } catch (err: unknown) {
    console.error("Connect webhook handler error:", err);
    return new Response(JSON.stringify({ error: "Handler failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
