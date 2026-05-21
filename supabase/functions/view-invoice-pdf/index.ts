import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { generateInvoicePdfBase64, pdfBase64ToBytes } from "../_shared/invoice-pdf.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const RATE_LIMIT_MAX = 30;

async function checkRateLimit(supabase: ReturnType<typeof createClient>, key: string) {
  const windowStart = new Date(Math.floor(Date.now() / RATE_LIMIT_WINDOW_MS) * RATE_LIMIT_WINDOW_MS).toISOString();
  const { data: existing } = await supabase
    .from("rate_limits")
    .select("id, count")
    .eq("key", key)
    .gte("window_start", windowStart)
    .maybeSingle();
  if (existing && existing.count >= RATE_LIMIT_MAX) {
    return false;
  }
  if (existing) {
    await supabase.from("rate_limits").update({ count: existing.count + 1 }).eq("id", existing.id);
  } else {
    await supabase.from("rate_limits").insert({ key, count: 1, window_start: windowStart });
  }
  return true;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { portalToken, invoiceId, inline } = body;

    if (!portalToken || !invoiceId) {
      return new Response(JSON.stringify({ error: "portalToken and invoiceId are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    if (!(await checkRateLimit(supabase, `view-invoice-pdf:${portalToken}:${invoiceId}`))) {
      return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: client } = await supabase
      .from("clients")
      .select("id, portal_enabled")
      .eq("portal_token", portalToken)
      .eq("portal_enabled", true)
      .maybeSingle();

    if (!client) {
      return new Response(JSON.stringify({ error: "Portal not available" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: invoice } = await supabase
      .from("invoices")
      .select("id")
      .eq("id", invoiceId)
      .eq("client_id", client.id)
      .in("status", ["sent", "paid", "overdue"])
      .maybeSingle();

    if (!invoice) {
      return new Response(JSON.stringify({ error: "Invoice not available" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { pdfBase64, invoiceNumber } = await generateInvoicePdfBase64(supabase, invoiceId);
    const safeName = String(invoiceNumber).replace(/[^\w.-]+/g, "_");

    if (inline === false) {
      return new Response(JSON.stringify({ pdfBase64, invoiceNumber }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const bytes = pdfBase64ToBytes(pdfBase64);
    return new Response(bytes, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${safeName}.pdf"`,
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch (err: unknown) {
    console.error("view-invoice-pdf error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
