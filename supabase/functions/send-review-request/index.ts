import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

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

const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const RATE_LIMIT_MAX_EMAILS = 30;

async function checkRateLimit(supabase: any, key: string, maxRequests: number): Promise<{ allowed: boolean; remaining: number }> {
  const windowStart = new Date(Math.floor(Date.now() / RATE_LIMIT_WINDOW_MS) * RATE_LIMIT_WINDOW_MS).toISOString();
  const { data: existing } = await supabase
    .from("rate_limits")
    .select("id, count")
    .eq("key", key)
    .gte("window_start", windowStart)
    .single();

  if (existing) {
    if (existing.count >= maxRequests) return { allowed: false, remaining: 0 };
    await supabase.from("rate_limits").update({ count: existing.count + 1 }).eq("id", existing.id);
    return { allowed: true, remaining: maxRequests - existing.count - 1 };
  }
  await supabase.from("rate_limits").insert({ key, count: 1, window_start: windowStart });
  return { allowed: true, remaining: maxRequests - 1 };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
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
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { reviewRequestId, origin } = await req.json();
    if (!reviewRequestId) {
      return new Response(JSON.stringify({ error: "Missing reviewRequestId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const baseUrl = (origin && typeof origin === "string") ? origin.replace(/\/$/, "") : "https://app.example.com";

    const rateLimitKey = `send-review-request:${user.id}`;
    const { allowed, remaining } = await checkRateLimit(supabase, rateLimitKey, RATE_LIMIT_MAX_EMAILS);
    if (!allowed) {
      return new Response(JSON.stringify({ error: "Rate limit exceeded. Try again later." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": "3600", "X-RateLimit-Remaining": "0" },
      });
    }

    const { data: request, error: requestError } = await supabase
      .from("review_requests")
      .select("id, title, version, share_token, due_date, user_id")
      .eq("id", reviewRequestId)
      .eq("user_id", user.id)
      .single();

    if (requestError || !request) {
      return new Response(JSON.stringify({ error: "Review request not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: recipients, error: recipientsError } = await supabase
      .from("review_recipients")
      .select("email")
      .eq("review_request_id", reviewRequestId);

    if (recipientsError || !recipients?.length) {
      return new Response(JSON.stringify({ error: "No recipients for this review request" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const reviewUrl = `${baseUrl}/review/${request.share_token}`;
    const safeTitle = escapeHtml(request.title);
    const dueText = request.due_date
      ? `Please review by <strong>${new Date(request.due_date).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</strong>.`
      : "";

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #9B63E9;">Review request: ${safeTitle}</h2>
        <p style="color: #333;">You've been asked to review <strong>${safeTitle}</strong> (v${escapeHtml(request.version)}).</p>
        ${dueText ? `<p style="color: #666;">${dueText}</p>` : ""}
        <p style="margin: 24px 0;">
          <a href="${escapeHtml(reviewUrl)}" style="display: inline-block; background: #9B63E9; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px;">Open review</a>
        </p>
        <p style="color: #999; font-size: 12px;">Or copy this link: ${escapeHtml(reviewUrl)}</p>
      </div>
    `;

    const toAddresses = recipients.map((r: { email: string }) => r.email).filter(Boolean);
    if (toAddresses.length === 0) {
      return new Response(JSON.stringify({ error: "No valid recipient emails" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: emailData, error: emailError } = await resend.emails.send({
      from: "Reviews <onboarding@resend.dev>",
      to: toAddresses,
      subject: `Review request: ${request.title} (v${request.version})`,
      html: emailHtml,
    });

    if (emailError) {
      console.error("Resend error:", emailError);
      return new Response(JSON.stringify({ error: `Failed to send email: ${emailError.message}` }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await supabase
      .from("review_requests")
      .update({ sent_at: new Date().toISOString() })
      .eq("id", reviewRequestId)
      .eq("user_id", user.id);

    return new Response(
      JSON.stringify({ success: true, messageId: emailData?.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json", "X-RateLimit-Remaining": String(remaining) } }
    );
  } catch (err: unknown) {
    console.error("send-review-request error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
