import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const RESEND_FROM_EMAIL = (Deno.env.get("RESEND_FROM_EMAIL") || "onboarding@resend.dev").trim();

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
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { token } = await req.json();
    if (!token) return new Response(JSON.stringify({ error: "Token is required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: proposal } = await supabase.from("proposals").select("id, status, identifier, user_id").eq("public_token", token).single();
    if (!proposal || proposal.status === "draft") {
      return new Response(JSON.stringify({ error: "Invalid proposal state" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (proposal.status !== "accepted") {
      await supabase.from("proposals").update({ status: "accepted", accepted_at: new Date().toISOString() }).eq("id", proposal.id);
      const { data: business } = await supabase
        .from("profiles")
        .select("business_name, business_email, email")
        .eq("user_id", proposal.user_id)
        .maybeSingle();
      const ownerEmail = business?.business_email || business?.email;
      if (ownerEmail && Deno.env.get("RESEND_API_KEY")) {
        await resend.emails.send({
          from: `${business?.business_name || "Lance"} <${RESEND_FROM_EMAIL}>`,
          to: [ownerEmail],
          subject: `Proposal accepted: ${proposal.identifier}`,
          html: `<div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
            <div style="padding:18px 20px;background:#9B63E9;color:white;"><strong>${escapeHtml(business?.business_name || "Your Business")}</strong></div>
            <div style="padding:20px;">
              <h2 style="color:#9B63E9;margin-top:0;">Proposal accepted</h2>
              <p style="color:#333;">Great news! Your proposal <strong>${escapeHtml(proposal.identifier)}</strong> was accepted by the client.</p>
            </div>
          </div>`,
        });
      }
    }
    return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error?.message || "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
