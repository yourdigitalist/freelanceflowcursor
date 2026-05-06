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
    const { token, preview } = await req.json();
    if (!token) return new Response(JSON.stringify({ error: "Token is required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const authHeader = req.headers.get("Authorization") ?? "";
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: proposal } = await supabase
      .from("proposals")
      .select("*, clients(name, company), projects(name)")
      .eq("public_token", token)
      .single();

    if (!proposal) {
      return new Response(JSON.stringify({ error: "Proposal not available" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (proposal.status === "draft") {
      const { data: authUser } = await supabaseAuth.auth.getUser();
      const canPreviewDraft = Boolean(preview) && !!authUser?.user && authUser.user.id === proposal.user_id;
      if (!canPreviewDraft) {
        return new Response(JSON.stringify({ error: "Proposal not available" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    const { data: business } = await supabase
      .from("profiles")
      .select("business_name, business_email, business_phone, business_logo, email")
      .eq("user_id", proposal.user_id)
      .maybeSingle();
    const normalizedBusiness = business
      ? {
          ...business,
          business_email: business.business_email || business.email || null,
        }
      : null;
    if (normalizedBusiness?.business_logo && !normalizedBusiness.business_logo.startsWith("http")) {
      const logoPath = normalizedBusiness.business_logo.replace(/^\/+/, "");
      normalizedBusiness.business_logo = `${Deno.env.get("SUPABASE_URL")}/storage/v1/object/public/business-logos/${logoPath}`;
    }

    if (proposal.status === "sent") {
      await supabase.from("proposals").update({ status: "read", read_at: new Date().toISOString() }).eq("id", proposal.id);
      proposal.status = "read";
      if (normalizedBusiness?.business_email && Deno.env.get("RESEND_API_KEY")) {
        await resend.emails.send({
          from: `${normalizedBusiness.business_name || "Lance"} <${RESEND_FROM_EMAIL}>`,
          to: [normalizedBusiness.business_email],
          subject: `Proposal viewed: ${proposal.identifier}`,
          html: `<div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
            <div style="padding:18px 20px;background:#9B63E9;color:white;"><strong>${escapeHtml(normalizedBusiness.business_name || "Your Business")}</strong></div>
            <div style="padding:20px;">
              <h2 style="color:#9B63E9;margin-top:0;">Proposal viewed by client</h2>
              <p style="color:#333;">Your proposal <strong>${escapeHtml(proposal.identifier)}</strong> has just been viewed.</p>
            </div>
          </div>`,
        });
      }
    }

    const { data: items } = await supabase.from("proposal_services").select("*").eq("proposal_id", proposal.id).order("position");
    let cover_image_signed_url: string | null = null;
    if (proposal.cover_image_url) {
      const { data } = await supabase.storage.from("proposal-images").createSignedUrl(proposal.cover_image_url, 3600);
      cover_image_signed_url = data?.signedUrl || null;
    }

    return new Response(JSON.stringify({ proposal, items: items || [], business: normalizedBusiness || null, cover_image_signed_url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error?.message || "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
