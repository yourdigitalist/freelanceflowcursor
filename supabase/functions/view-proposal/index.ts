import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";
import {
  escapeHtml,
  getDefaultLanceFooter,
  getDefaultLanceHeader,
} from "../_shared/lance-email.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const RESEND_FROM_EMAIL = (Deno.env.get("RESEND_FROM_EMAIL") || "onboarding@resend.dev").trim();
const APP_BASE_URL = (Deno.env.get("APP_BASE_URL") || "https://www.getlance.app").trim().replace(/\/$/, "");

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
      .select("*, clients(name, company, logo_url), projects(name)")
      .eq("public_token", token)
      .single();

    if (!proposal) {
      return new Response(JSON.stringify({ error: "Proposal not available" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const { data: authUser } = await supabaseAuth.auth.getUser();
    const isOwnerView = !!authUser?.user && authUser.user.id === proposal.user_id;

    if (proposal.status === "draft") {
      const canPreviewDraft = Boolean(preview) && isOwnerView;
      if (!canPreviewDraft) {
        return new Response(JSON.stringify({ error: "Proposal not available" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    const { data: business } = await supabase
      .from("profiles")
      .select("business_name, business_email, business_phone, business_logo, email, notification_preferences")
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

    // Atomically mark first client view (sent → read); only the winning request sends email.
    const { data: firstRead } = await supabase
      .from("proposals")
      .update({ status: "read", read_at: new Date().toISOString() })
      .eq("id", proposal.id)
      .eq("status", "sent")
      .select("id, identifier")
      .maybeSingle();

    if (firstRead) {
      proposal.status = "read";
      proposal.read_at = new Date().toISOString();
      const ownerEmail = (normalizedBusiness?.business_email || normalizedBusiness?.email || "").trim();
      if (!isOwnerView && ownerEmail && Deno.env.get("RESEND_API_KEY")) {
        const { data: branding } = await supabase.from("app_branding").select("primary_color").eq("id", 1).maybeSingle();
        const primaryColor = (branding?.primary_color as string | null) || "#9B63E9";
        const proposalUrl = `${APP_BASE_URL}/proposals/${proposal.id}`;
        const safeIdentifier = escapeHtml(firstRead.identifier || proposal.identifier);
        const safeUrl = escapeHtml(proposalUrl);
        const coreHtml = `
              <h2 style="margin: 0 0 12px; color: ${primaryColor};">Proposal viewed by client</h2>
              <p style="color: #333; margin: 0 0 20px;">Your proposal <strong>${safeIdentifier}</strong> was opened by the client.</p>
              <p style="margin: 0;">
                <a href="${safeUrl}" style="display: inline-block; background: ${primaryColor}; color: #ffffff !important; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">View proposal</a>
              </p>`;
        const html = `${getDefaultLanceHeader(primaryColor)}${coreHtml}${getDefaultLanceFooter(primaryColor)}`;
        const text = `Your proposal ${firstRead.identifier || proposal.identifier} was opened by the client.\n\nView proposal: ${proposalUrl}`;

        await resend.emails.send({
          from: `Get Lance <${RESEND_FROM_EMAIL}>`,
          to: [ownerEmail],
          subject: `Proposal viewed: ${firstRead.identifier || proposal.identifier}`,
          text,
          html,
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
