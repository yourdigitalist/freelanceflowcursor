// @ts-nocheck
// Supabase Edge Function (Deno): create Stripe Checkout Session for subscription (15-day trial).
// Requires: STRIPE_SECRET_KEY. Frontend passes priceId (monthly or annual).
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
  // Validate user JWT with anon client + Authorization header (same as frontend); service-role getUser(jwt) can fail for new/unconfirmed users
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

  let body: { priceId?: string; successUrl?: string; cancelUrl?: string };
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

  const origin = req.headers.get("origin") || req.headers.get("referer")?.replace(/\/$/, "") || "https://localhost";
  const baseUrl = typeof origin === "string" ? origin.replace(/\/$/, "") : "https://localhost";
  const successUrl = body.successUrl || `${baseUrl}/settings/subscription?session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = body.cancelUrl || `${baseUrl}/settings/subscription`;

  const { data: profile } = await supabase
    .from("profiles")
    .select("email")
    .eq("user_id", user.id)
    .maybeSingle();

  const customerEmail = (profile?.email as string) || user.email || undefined;

  const stripe = new Stripe(stripeSecret);

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: {
        trial_period_days: 15,
        metadata: { user_id: user.id },
      },
      client_reference_id: user.id,
      customer_email: customerEmail,
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: { user_id: user.id },
    });

    return new Response(
      JSON.stringify({ url: session.url }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
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
