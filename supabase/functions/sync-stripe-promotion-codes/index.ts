// @ts-nocheck
// Admin-only: backfill profiles.stripe_promotion_code from Stripe subscriptions.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import Stripe from "https://esm.sh/stripe@14.21.0?target=denonext";
import {
  promotionCodeFromSubscription,
  SUBSCRIPTION_DISCOUNT_EXPANDS,
} from "../_shared/stripe-promotion-code.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
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

  const authHeader = req.headers.get("Authorization") || req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const token = authHeader.replace("Bearer ", "");

  let isServiceRole = token === serviceKey;
  if (!isServiceRole) {
    try {
      const payload = JSON.parse(atob(token.split(".")[1] ?? ""));
      isServiceRole = payload?.role === "service_role";
    } catch {
      // not a JWT
    }
  }

  if (!isServiceRole) {
    const anonKey = req.headers.get("apikey") || Deno.env.get("SUPABASE_ANON_KEY") || "";
    const supabaseAuth = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
      error: userError,
    } = await supabaseAuth.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized", detail: userError?.message }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: profile } = await supabaseAuth
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

  const supabase = createClient(supabaseUrl, serviceKey);
  const stripe = new Stripe(stripeSecret);

  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("user_id, email, stripe_subscription_id, stripe_customer_id, stripe_promotion_code")
    .not("stripe_subscription_id", "is", null);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let scanned = 0;
  let updated = 0;
  const noCode: string[] = [];
  const failures: string[] = [];

  for (const row of profiles ?? []) {
    if (!row.stripe_subscription_id) continue;

    scanned += 1;
    try {
      const sub = await stripe.subscriptions.retrieve(row.stripe_subscription_id, {
        expand: [...SUBSCRIPTION_DISCOUNT_EXPANDS],
      });
      const code = promotionCodeFromSubscription(sub);
      if (!code) {
        noCode.push(row.email ?? row.user_id);
        continue;
      }

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ stripe_promotion_code: code })
        .eq("user_id", row.user_id);

      if (!updateError) {
        updated += 1;
      } else {
        failures.push(`${row.email ?? row.user_id}: ${updateError.message}`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Stripe error";
      failures.push(`${row.email ?? row.user_id}: ${message}`);
    }
  }

  return new Response(JSON.stringify({ ok: true, scanned, updated, noCode, failures }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
