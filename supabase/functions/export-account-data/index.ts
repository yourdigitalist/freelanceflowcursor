// @ts-nocheck
// Export account data as JSON (authenticated user or deletion warning export token).
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { exportUserAccountData } from "../_shared/account-deletion.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "GET" && req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const adminClient = createClient(supabaseUrl, serviceKey);

  let token: string | null = null;
  if (req.method === "GET") {
    token = new URL(req.url).searchParams.get("token");
  } else {
    try {
      const body = await req.json();
      token = typeof body?.token === "string" ? body.token : null;
    } catch {
      token = null;
    }
  }

  let userId: string | null = null;

  if (token) {
    const { data: profile } = await adminClient
      .from("profiles")
      .select("user_id, scheduled_deletion_at, account_soft_deleted_at")
      .eq("deletion_export_token", token)
      .maybeSingle();

    if (!profile?.user_id) {
      return new Response(JSON.stringify({ error: "Invalid or expired export link" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const deadline = profile.scheduled_deletion_at
      ? new Date(profile.scheduled_deletion_at)
      : null;
    const softDeleted = profile.account_soft_deleted_at != null;
    if (softDeleted || (deadline && deadline < new Date(Date.now() - 24 * 60 * 60 * 1000))) {
      return new Response(JSON.stringify({ error: "Export link has expired" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    userId = profile.user_id as string;
  } else {
    const authHeader = req.headers.get("Authorization") || req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    userId = user.id;
  }

  try {
    const payload = await exportUserAccountData(adminClient, userId);
    const filename = `lance-account-export-${new Date().toISOString().slice(0, 10)}.json`;
    const json = JSON.stringify(payload, null, 2);

    return new Response(json, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Export failed";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
