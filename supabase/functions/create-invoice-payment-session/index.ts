// @ts-nocheck
// Create/reuse Stripe Checkout on the freelancer's Connect account for an invoice (TEST MODE).
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import {
  appBaseUrl,
  ensureInvoicePaymentSession,
  getConnectStripe,
  isConnectReady,
} from "../_shared/stripe-connect.ts";

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

    let body: { invoiceId?: string } = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }
    const invoiceId = body.invoiceId?.trim();
    if (!invoiceId) {
      return new Response(JSON.stringify({ error: "Missing invoiceId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select(
        "currency, stripe_connect_account_id, stripe_connect_charges_enabled, stripe_connect_fees_acknowledged_at",
      )
      .eq("user_id", user.id)
      .maybeSingle();
    if (profileError) throw profileError;

    if (!isConnectReady(profile || {})) {
      return new Response(
        JSON.stringify({
          error:
            "Stripe Connect is not ready. Connect your Stripe account in Settings → Client payments and complete onboarding.",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data: invoice, error: invError } = await supabase
      .from("invoices")
      .select(
        "id, invoice_number, total, status, stripe_checkout_session_id, stripe_payment_url, stripe_payment_amount_cents, stripe_payment_currency, client_id, clients(name, email, portal_token, portal_enabled)",
      )
      .eq("id", invoiceId)
      .eq("user_id", user.id)
      .single();

    if (invError || !invoice) {
      return new Response(JSON.stringify({ error: "Invoice not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const base = appBaseUrl(req);
    const client = invoice.clients as {
      portal_token?: string | null;
      portal_enabled?: boolean | null;
    } | null;
    const portalToken = client?.portal_enabled && client?.portal_token ? client.portal_token : null;
    const successUrl = portalToken
      ? `${base}/portal/${portalToken}/invoice/${invoiceId}?payment=success`
      : `${base}/settings/payments?invoice_paid=1`;
    const cancelUrl = portalToken
      ? `${base}/portal/${portalToken}/invoice/${invoiceId}?payment=cancelled`
      : `${base}/invoices/${invoiceId}`;

    const stripe = getConnectStripe();
    const session = await ensureInvoicePaymentSession({
      stripe,
      supabase,
      invoice,
      userId: user.id,
      connectAccountId: profile!.stripe_connect_account_id!,
      currency: (profile?.currency || "USD").toLowerCase(),
      successUrl,
      cancelUrl,
    });

    if (!session) {
      return new Response(JSON.stringify({ error: "Invoice is not payable" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ url: session.url, sessionId: session.sessionId }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("create-invoice-payment-session:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
