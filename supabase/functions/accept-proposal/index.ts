import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";
import {
  escapeHtml,
  getDefaultLanceFooter,
  getDefaultLanceHeader,
} from "../_shared/lance-email.ts";
import {
  channelEnabled,
  getProposalPrefs,
  type NotificationPreferences,
  upsertUserNotification,
} from "../_shared/user-notification.ts";

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
        .select("business_email, email, notification_preferences")
        .eq("user_id", proposal.user_id)
        .maybeSingle();
      const prefs = getProposalPrefs(
        (business?.notification_preferences as NotificationPreferences | null) || null,
      );
      const title = "Proposal accepted";
      const body = `Your proposal ${proposal.identifier} was accepted by the client.`;
      const link = `/proposals/${proposal.id}`;
      const eventKey = `proposal_accepted:${proposal.id}`;

      if (channelEnabled(prefs?.accepted, "inApp")) {
        await upsertUserNotification(supabase, {
          user_id: proposal.user_id,
          type: "proposal",
          title,
          body,
          link,
          event_key: eventKey,
        });
      }

      const ownerEmail = (business?.business_email || business?.email || "").trim();
      if (channelEnabled(prefs?.accepted, "email") && ownerEmail && Deno.env.get("RESEND_API_KEY")) {
        const { data: branding } = await supabase.from("app_branding").select("primary_color").eq("id", 1).maybeSingle();
        const primaryColor = (branding?.primary_color as string | null) || "#9B63E9";
        const proposalUrl = `${APP_BASE_URL}/proposals/${proposal.id}`;
        const safeIdentifier = escapeHtml(proposal.identifier);
        const safeUrl = escapeHtml(proposalUrl);
        const coreHtml = `
              <h2 style="margin: 0 0 12px; color: ${primaryColor};">Proposal accepted</h2>
              <p style="color: #333; margin: 0 0 20px;">Great news! Your proposal <strong>${safeIdentifier}</strong> was accepted by the client.</p>
              <p style="margin: 0;">
                <a href="${safeUrl}" style="display: inline-block; background: ${primaryColor}; color: #ffffff !important; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">View proposal</a>
              </p>`;
        const html = `${getDefaultLanceHeader(primaryColor)}${coreHtml}${getDefaultLanceFooter(primaryColor)}`;
        const text = `${body}\n\nView proposal: ${proposalUrl}`;

        await resend.emails.send({
          from: `Get Lance <${RESEND_FROM_EMAIL}>`,
          to: [ownerEmail],
          subject: `Proposal accepted: ${proposal.identifier}`,
          text,
          html,
        });
      }
    }
    return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error?.message || "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
