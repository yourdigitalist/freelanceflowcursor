import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const RATE_LIMIT_MAX = 120;

async function checkRateLimit(supabase: ReturnType<typeof createClient>, key: string) {
  const windowStart = new Date(Math.floor(Date.now() / RATE_LIMIT_WINDOW_MS) * RATE_LIMIT_WINDOW_MS).toISOString();
  const { data: existing } = await supabase
    .from("rate_limits")
    .select("id, count")
    .eq("key", key)
    .gte("window_start", windowStart)
    .maybeSingle();
  if (existing && existing.count >= RATE_LIMIT_MAX) {
    return { allowed: false };
  }
  if (existing) {
    await supabase.from("rate_limits").update({ count: existing.count + 1 }).eq("id", existing.id);
  } else {
    await supabase.from("rate_limits").insert({ key, count: 1, window_start: windowStart });
  }
  return { allowed: true };
}

type PortalSections = {
  details?: boolean;
  invoices?: boolean;
  proposals?: boolean;
  contracts?: boolean;
  approvals?: boolean;
  time?: boolean;
  time_visibility?: string;
};

function parseSections(raw: unknown): PortalSections {
  if (!raw || typeof raw !== "object") return {};
  return raw as PortalSections;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const token = typeof body.token === "string" ? body.token.trim() : "";
    const preview = body.preview;
    const invoiceId = body.invoiceId;
    if (!token) {
      return new Response(JSON.stringify({ error: "Token is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabase = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const rate = await checkRateLimit(supabase, `view-client-portal:${token}`);
    if (!rate.allowed) {
      return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: client, error: clientErr } = await supabase
      .from("clients")
      .select(
        "id, user_id, name, first_name, last_name, email, phone, company, tax_id, street, street2, city, state, postal_code, country, logo_url, avatar_color, portal_enabled, portal_sections",
      )
      .eq("portal_token", token)
      .maybeSingle();

    if (clientErr || !client) {
      return new Response(JSON.stringify({ error: "Portal not available" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    const supabaseAuth = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: authUser } = await supabaseAuth.auth.getUser();
    const isOwnerPreview = Boolean(preview) && !!authUser?.user && authUser.user.id === client.user_id;

    if (!client.portal_enabled && !isOwnerPreview) {
      return new Response(JSON.stringify({ error: "Portal not available" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sections = parseSections(client.portal_sections);
    const show = (key: keyof PortalSections) => sections[key] !== false;

    const { data: profile } = await supabase
      .from("profiles")
      .select("business_name, business_logo, business_email, email, client_email_primary_color, date_format")
      .eq("user_id", client.user_id)
      .maybeSingle();

    let businessLogo = (profile?.business_logo || "").trim();
    if (businessLogo && !businessLogo.startsWith("http")) {
      businessLogo = `${supabaseUrl.replace(/\/$/, "")}${businessLogo.startsWith("/") ? businessLogo : `/${businessLogo}`}`;
    }
    let clientLogo = (client.logo_url || "").trim();
    if (clientLogo && !clientLogo.startsWith("http")) {
      clientLogo = `${supabaseUrl.replace(/\/$/, "")}/storage/v1/object/public/client-logos/${clientLogo.replace(/^\/+/, "")}`;
    }

    const business = {
      business_name: profile?.business_name || null,
      business_logo: businessLogo || null,
      business_email: profile?.business_email || profile?.email || null,
      primary_color: (profile?.client_email_primary_color || "#9B63E9").trim(),
      date_format: profile?.date_format || "DD/MM/YYYY",
    };

    const clientDetails = {
      name: client.name,
      first_name: client.first_name,
      last_name: client.last_name,
      email: client.email,
      phone: client.phone,
      company: client.company,
      tax_id: client.tax_id,
      street: client.street,
      street2: client.street2,
      city: client.city,
      state: client.state,
      postal_code: client.postal_code,
      country: client.country,
      logo_url: clientLogo || null,
      avatar_color: client.avatar_color,
    };

    const portalToken = token as string;
    const clientId = client.id as string;
    const userId = client.user_id as string;

    const result: Record<string, unknown> = {
      portal_token: portalToken,
      preview: isOwnerPreview,
      enabled: client.portal_enabled,
      sections,
      business,
      client: clientDetails,
    };

    if (show("invoices")) {
      const { data: invoices } = await supabase
        .from("invoices")
        .select("id, invoice_number, status, total, due_date, issue_date")
        .eq("client_id", clientId)
        .eq("user_id", userId)
        .in("status", ["sent", "paid", "overdue"])
        .order("created_at", { ascending: false });
      result.invoices = invoices || [];
    }

    if (show("proposals")) {
      const { data: proposals } = await supabase
        .from("proposals")
        .select("id, identifier, status, total, expires_at, public_token")
        .eq("client_id", clientId)
        .eq("user_id", userId)
        .neq("status", "draft")
        .order("created_at", { ascending: false });
      result.proposals = proposals || [];
    }

    if (show("contracts")) {
      const { data: contracts } = await supabase
        .from("contracts")
        .select("id, identifier, status, total, public_token")
        .eq("client_id", clientId)
        .eq("user_id", userId)
        .neq("status", "draft")
        .order("created_at", { ascending: false });
      result.contracts = contracts || [];
    }

    if (show("approvals")) {
      const { data: approvals } = await supabase
        .from("review_requests")
        .select("id, title, status, created_at, share_token, projects(name)")
        .eq("client_id", clientId)
        .eq("user_id", userId)
        .neq("status", "draft")
        .order("created_at", { ascending: false });
      result.approvals = approvals || [];
    }

    if (show("time")) {
      const vis = sections.time_visibility || "both";
      const { data: projects } = await supabase
        .from("projects")
        .select("id")
        .eq("client_id", clientId)
        .eq("user_id", userId);
      const projectIds = (projects || []).map((p: { id: string }) => p.id);
      if (projectIds.length > 0) {
        let q = supabase
          .from("time_entries")
          .select(
            "id, project_id, task_id, description, started_at, start_time, total_duration_seconds, duration_minutes, billable, projects(name), tasks(title)",
          )
          .in("project_id", projectIds)
          .eq("user_id", userId)
          .order("started_at", { ascending: false });
        if (vis === "billable") q = q.eq("billable", true);
        else if (vis === "non_billable") q = q.eq("billable", false);
        const { data: timeEntries } = await q;
        result.time_entries = timeEntries || [];
      } else {
        result.time_entries = [];
      }
    }

    if (invoiceId && typeof invoiceId === "string") {
      const { data: inv } = await supabase
        .from("invoices")
        .select("id, invoice_number, status")
        .eq("id", invoiceId)
        .eq("client_id", clientId)
        .in("status", ["sent", "paid", "overdue"])
        .maybeSingle();
      result.invoice_meta = inv || null;
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    console.error("view-client-portal error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
