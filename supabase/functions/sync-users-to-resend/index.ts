/* @ts-nocheck
 * Supabase Edge Function: sync profiles to Resend contacts and segments for marketing.
 * Users are opted in to marketing at signup; they can unsubscribe in Notification settings or via email link.
 * Invoke: POST with optional body { user_id: "uuid" } to sync one user (e.g. after signup); no body = full sync.
 * Requires RESEND_API_KEY and SUPABASE_SERVICE_ROLE_KEY. Optionally protect with admin check for full sync.
 */
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const RESEND_API = "https://api.resend.com";

function resendFetch(apiKey: string, path: string, opts: RequestInit = {}) {
  const url = path.startsWith("http") ? path : `${RESEND_API}${path}`;
  const headers = new Headers(opts.headers);
  headers.set("Authorization", `Bearer ${apiKey}`);
  headers.set("Content-Type", "application/json");
  return fetch(url, { ...opts, headers });
}

async function resendSegmentsList(apiKey: string): Promise<{ data?: { id: string; name: string }[]; error?: { message: string } }> {
  const r = await resendFetch(apiKey, "/segments", { method: "GET" });
  const j = await r.json();
  if (!r.ok) return { error: { message: (j as { message?: string }).message || r.statusText } };
  return { data: (j as { data?: { id: string; name: string }[] }).data || [] };
}

async function resendSegmentCreate(apiKey: string, name: string): Promise<{ id?: string; error?: { message: string } }> {
  const r = await resendFetch(apiKey, "/segments", { method: "POST", body: JSON.stringify({ name }) });
  const j = await r.json();
  if (!r.ok) return { error: { message: (j as { message?: string }).message || r.statusText } };
  return { id: (j as { id?: string }).id };
}

async function resendContactGet(apiKey: string, email: string): Promise<{ id?: string; error?: { message: string } }> {
  const r = await resendFetch(apiKey, `/contacts/${encodeURIComponent(email)}`, { method: "GET" });
  const j = await r.json();
  if (!r.ok) return { error: { message: (j as { message?: string }).message || r.statusText } };
  return { id: (j as { id?: string }).id };
}

async function resendContactCreate(apiKey: string, params: { email: string; firstName?: string; lastName?: string; unsubscribed: boolean }): Promise<{ id?: string; error?: { message: string } }> {
  const r = await resendFetch(apiKey, "/contacts", {
    method: "POST",
    body: JSON.stringify({
      email: params.email,
      first_name: params.firstName,
      last_name: params.lastName,
      unsubscribed: params.unsubscribed,
    }),
  });
  const j = await r.json();
  if (!r.ok) return { error: { message: (j as { message?: string }).message || r.statusText } };
  return { id: (j as { id?: string }).id };
}

async function resendContactUpdate(apiKey: string, email: string, params: { firstName?: string; lastName?: string; unsubscribed: boolean }): Promise<{ error?: { message: string } }> {
  const r = await resendFetch(apiKey, `/contacts/${encodeURIComponent(email)}`, {
    method: "PATCH",
    body: JSON.stringify({
      first_name: params.firstName,
      last_name: params.lastName,
      unsubscribed: params.unsubscribed,
    }),
  });
  const j = await r.json();
  if (!r.ok) return { error: { message: (j as { message?: string }).message || r.statusText } };
  return {};
}

async function resendContactAddToSegment(apiKey: string, email: string, segmentId: string): Promise<{ error?: { message: string } }> {
  const r = await resendFetch(apiKey, `/contacts/${encodeURIComponent(email)}/segments/${segmentId}`, { method: "POST" });
  const j = await r.json();
  if (!r.ok) return { error: { message: (j as { message?: string }).message || r.statusText } };
  return {};
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, content-type",
};

// Resend plan limit: 3 segments. Use these for targeting (Trial vs Paid vs everyone).
const SEGMENT_NAMES = ["All Users", "Trial", "Paid"] as const;

type ProfileRow = {
  user_id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  full_name: string | null;
  subscription_status: string | null;
  plan_type: string | null;
  trial_end_date: string | null;
  onboarding_completed: boolean | null;
  is_admin: boolean | null;
  notification_preferences: { marketing?: { email?: boolean } } | null;
};

function isMarketingOptedIn(prefs: ProfileRow["notification_preferences"]): boolean {
  if (!prefs || typeof prefs !== "object") return true;
  const m = prefs.marketing;
  if (!m || typeof m !== "object") return true;
  return m.email !== false;
}

function getSegmentNames(p: ProfileRow): string[] {
  const names: string[] = ["All Users"];
  const status = (p.subscription_status || "").toLowerCase();
  const plan = (p.plan_type || "").toLowerCase();

  if (status === "trial") names.push("Trial");
  else if (status === "active" || plan === "pro" || plan === "team") names.push("Paid");

  return names;
}

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

  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "RESEND_API_KEY not set" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  let body: { user_id?: string } = {};
  try {
    const text = await req.text();
    if (text) body = JSON.parse(text);
  } catch {
    // empty body = full sync
  }

  const singleUserId = body.user_id;

  // Auth: full sync = admin JWT or service role key (for cron); single-user sync = that user's JWT only
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Missing or invalid Authorization header" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const token = authHeader.replace("Bearer ", "");
  const cronAuthKey = Deno.env.get("RESEND_SYNC_CRON_KEY"); // custom secret you set = service role key (for cron + manual full sync)

  // Cron/manual full sync: Bearer token must match RESEND_SYNC_CRON_KEY (set in Edge Function secrets to your service role key)
  if (!singleUserId && cronAuthKey && token === cronAuthKey) {
    // Authorized; proceed to full sync
  } else {
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser(token);
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (singleUserId) {
      if (user.id !== singleUserId) {
        return new Response(JSON.stringify({ error: "Can only sync your own user" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      const { data: profile } = await userClient.from("profiles").select("is_admin").eq("user_id", user.id).single();
      if (!profile?.is_admin) {
        return new Response(JSON.stringify({ error: "Admin required for full sync" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }
  }

  try {
  // 1) Get or create segments (Resend REST API)
  const { data: existingSegments, error: segmentsListError } = await resendSegmentsList(apiKey);
  if (segmentsListError) {
    return new Response(JSON.stringify({ error: `Resend segments list: ${segmentsListError.message}` }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const segmentIdsByName: Record<string, string> = {};
  for (const s of existingSegments || []) {
    if (s.name) segmentIdsByName[s.name] = s.id;
  }
  // Resend default segment is often "General" – use it as "All Users" so we don't use a slot, and "Paid"/"Trial" can exist
  if (segmentIdsByName["General"] && !segmentIdsByName["All Users"]) {
    segmentIdsByName["All Users"] = segmentIdsByName["General"];
  }
  for (const name of SEGMENT_NAMES) {
    if (segmentIdsByName[name]) continue;
    const created = await resendSegmentCreate(apiKey, name);
    if (created.error) {
      // Plan limit (e.g. "3 segments") or other: don't fail whole sync; skip this segment
      if (created.error.message?.includes("segment") && created.error.message?.toLowerCase().includes("plan")) continue;
      return new Response(JSON.stringify({ error: `Resend segment create ${name}: ${created.error.message}` }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (created.id) segmentIdsByName[name] = created.id;
  }

  // 2) Fetch profiles
  const select =
    "user_id, email, first_name, last_name, full_name, subscription_status, plan_type, trial_end_date, onboarding_completed, is_admin, notification_preferences";
  let profiles: ProfileRow[] = [];

  if (singleUserId) {
    const { data, error } = await supabase
      .from("profiles")
      .select(select)
      .eq("user_id", singleUserId)
      .maybeSingle();
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (data) profiles = [data as ProfileRow];
  } else {
    const { data, error } = await supabase.from("profiles").select(select);
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    profiles = (data || []) as ProfileRow[];
  }

  let created = 0;
  let updated = 0;
  let segmentAdds = 0;
  const errors: string[] = [];

  for (const p of profiles) {
    const email = (p.email || "").trim().toLowerCase();
    if (!email) continue;

    const firstName = p.first_name || (p.full_name || "").split(/\s+/)[0] || null;
    const lastName = p.last_name || (p.full_name || "").split(/\s+/).slice(1).join(" ") || null;
    const unsubscribed = !isMarketingOptedIn(p.notification_preferences);

    // Create or update contact (Resend REST API)
    const existing = await resendContactGet(apiKey, email);
    if (existing.id) {
      const err = await resendContactUpdate(apiKey, email, {
        firstName: firstName ?? undefined,
        lastName: lastName ?? undefined,
        unsubscribed,
      });
      if (err.error) errors.push(`${email}: ${err.error.message}`);
      else updated++;
    } else {
      const result = await resendContactCreate(apiKey, {
        email,
        firstName: firstName ?? undefined,
        lastName: lastName ?? undefined,
        unsubscribed,
      });
      if (result.error) {
        const updateResult = await resendContactUpdate(apiKey, email, {
          firstName: firstName ?? undefined,
          lastName: lastName ?? undefined,
          unsubscribed,
        });
        if (updateResult.error) errors.push(`${email}: ${result.error.message}`);
        else updated++;
      } else created++;
    }

    const segmentNames = getSegmentNames(p);
    for (const segName of segmentNames) {
      const segmentId = segmentIdsByName[segName];
      if (!segmentId) continue;
      const addResult = await resendContactAddToSegment(apiKey, email, segmentId);
      if (addResult.error) {
        if (addResult.error.message?.toLowerCase().includes("already")) continue;
        errors.push(`${email} -> ${segName}: ${addResult.error.message}`);
      } else segmentAdds++;
    }
  }

  return new Response(
    JSON.stringify({
      ok: true,
      created,
      updated,
      segmentAdds,
      profilesProcessed: profiles.filter((p) => (p.email || "").trim()).length,
      errors: errors.length ? errors : undefined,
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
