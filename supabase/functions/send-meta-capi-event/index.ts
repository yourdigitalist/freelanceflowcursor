// @ts-nocheck
// Send events to Meta Conversions API (CAPI). Use for server-side conversion tracking and Meta test events.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import {
  buildWebsiteEvent,
  sendMetaConversionEvents,
} from "../_shared/meta-conversions-api.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, content-type",
};

const DEFAULT_TEST_EVENT_CODE = "TEST69130";

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

  const accessToken = (Deno.env.get("META_CAPI_ACCESS_TOKEN") || "").trim();
  if (!accessToken) {
    return new Response(JSON.stringify({
      error: "META_CAPI_ACCESS_TOKEN not set. Add it in Supabase Edge Function secrets (Events Manager → Conversions API → Generate access token).",
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const authHeader = req.headers.get("Authorization") || req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Missing or invalid Authorization header" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const token = authHeader.replace("Bearer ", "");
  const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
  const { data: { user } } = await userClient.auth.getUser(token);
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const { data: profile } = await userClient.from("profiles").select("is_admin").eq("user_id", user.id).maybeSingle();
  if (!profile?.is_admin) {
    return new Response(JSON.stringify({ error: "Admin required" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: {
    event_name?: string;
    event_source_url?: string;
    test_event_code?: string;
    email?: string;
  } = {};
  try {
    const text = await req.text();
    if (text) body = JSON.parse(text);
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const eventName = (body.event_name || "PageView").trim();
  const eventSourceUrl = (body.event_source_url || Deno.env.get("APP_BASE_URL") || "https://www.getlance.app/").trim();
  const testEventCode = (body.test_event_code || DEFAULT_TEST_EVENT_CODE).trim();
  const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || req.headers.get("cf-connecting-ip")
    || req.headers.get("x-real-ip")
    || undefined;
  const clientUserAgent = req.headers.get("user-agent") || undefined;

  const event = await buildWebsiteEvent({
    eventName,
    eventSourceUrl,
    clientIpAddress: clientIp,
    clientUserAgent,
    email: body.email || user.email || undefined,
  });

  const result = await sendMetaConversionEvents({
    accessToken,
    events: [event],
    testEventCode,
  });

  if (!result.ok) {
    const errMsg = typeof result.body === "object" && result.body && "error" in result.body
      ? JSON.stringify((result.body as { error?: unknown }).error)
      : JSON.stringify(result.body);
    return new Response(JSON.stringify({
      error: `Meta API error (${result.status}): ${errMsg}`,
      meta_response: result.body,
    }), {
      status: 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({
    ok: true,
    test_event_code: testEventCode,
    event_name: eventName,
    event_id: event.event_id,
    event_source_url: eventSourceUrl,
    meta_response: result.body,
  }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
