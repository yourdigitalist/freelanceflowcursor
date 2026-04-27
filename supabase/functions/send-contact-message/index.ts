// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const RESEND_FROM_EMAIL = (Deno.env.get("RESEND_FROM_EMAIL") || "onboarding@resend.dev").trim();
const SUPPORT_EMAIL = "hello@getlance.app";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function escapeHtml(text: string | null | undefined): string {
  if (!text) return "";
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    if (!Deno.env.get("RESEND_API_KEY")) {
      return new Response(JSON.stringify({ error: "RESEND_API_KEY not set" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get("authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.replace("Bearer ", "") : null;
    const { data: authData } = token ? await supabase.auth.getUser(token) : { data: { user: null } as { user: null } };
    const user = authData?.user ?? null;
    const body = await req.json().catch(() => ({}));

    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const email = typeof body?.email === "string" ? body.email.trim() : "";
    const message = typeof body?.message === "string" ? body.message.trim() : "";
    const page = typeof body?.page === "string" ? body.page.trim() : "";

    if (!message) {
      return new Response(JSON.stringify({ error: "message is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("user_id", user?.id || "")
      .maybeSingle();

    const senderName = name || profile?.full_name || "Unknown user";
    const senderEmail = email || profile?.email || user?.email || "";

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
        <div style="padding: 16px 20px; background: #9B63E9; color: white;">
          <strong style="font-size: 16px;">New Contact Message</strong>
        </div>
        <div style="padding: 20px;">
          <p style="margin-top: 0;"><strong>From:</strong> ${escapeHtml(senderName)}</p>
          <p><strong>Email:</strong> ${escapeHtml(senderEmail || "N/A")}</p>
          <p><strong>User ID:</strong> ${escapeHtml(user?.id || "N/A")}</p>
          <p><strong>Page:</strong> ${escapeHtml(page || "N/A")}</p>
          <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 16px 0;" />
          <p style="margin-bottom: 8px;"><strong>Message</strong></p>
          <div style="white-space: pre-wrap; color: #111827;">${escapeHtml(message).replace(/\n/g, "<br>")}</div>
        </div>
      </div>
    `;

    const { error: sendError } = await resend.emails.send({
      from: `Lance Contact <${RESEND_FROM_EMAIL}>`,
      to: [SUPPORT_EMAIL],
      subject: "New contact message from Lance app",
      html,
      ...(senderEmail ? { reply_to: senderEmail } : {}),
    });

    if (sendError) {
      return new Response(JSON.stringify({ error: sendError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

