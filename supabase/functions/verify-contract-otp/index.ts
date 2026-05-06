import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const RESEND_FROM_EMAIL = (Deno.env.get("RESEND_FROM_EMAIL") || "onboarding@resend.dev").trim();
const APP_BASE_URL = (Deno.env.get("APP_BASE_URL") || "").trim().replace(/\/$/, "");

function escapeHtml(text: string | null | undefined): string {
  if (!text) return "";
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function replaceTokens(template: string, tokens: Record<string, string>): string {
  return Object.entries(tokens).reduce((out, [key, value]) => {
    const re = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, "gi");
    return out.replace(re, value);
  }, template);
}

function getDefaultClientHeader(logoUrl: string, businessName: string, primaryColor: string): string {
  return `<div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
  <div style="padding: 18px 20px; background: ${primaryColor}; color: white;">
    ${logoUrl ? `<img src="${logoUrl}" alt="${escapeHtml(businessName)}" style="height: 28px; max-width: 160px; object-fit: contain;" />` : `<strong style="font-size: 18px;">${escapeHtml(businessName)}</strong>`}
  </div>
  <div style="padding: 20px;">`;
}

function getDefaultClientFooter(primaryColor: string): string {
  return `</div><div style="padding: 14px 20px; font-size: 12px; color: #6b7280; border-top: 1px solid #e5e7eb;">
  Sent by <span style="color: ${primaryColor}; font-weight: 600;">Lance</span>
</div></div>`;
}

function normalizeLogoUrl(rawLogo: string, supabaseUrl: string): string {
  const trimmed = (rawLogo || "").trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
  const base = (supabaseUrl || "").replace(/\/$/, "");
  return `${base}${trimmed.startsWith("/") ? trimmed : `/${trimmed}`}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const {
      token,
      contract_id,
      code,
      signer_type,
      signer_name,
      signer_email,
      signer_tax_id,
      signer_ip,
      signer_geo,
      signer_device,
      signer_isp,
      email_verified,
    } = await req.json();
    const signerType = signer_type === "freelancer" ? "freelancer" : "client";
    if ((!token && !contract_id) || !code) {
      return new Response(JSON.stringify({ error: "Token/contract_id and code are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    let contractQuery = supabase
      .from("contracts")
      .select("id, status, freelancer_signed_at, client_signed_at, client_id, user_id, identifier, public_token, freelancer_email, client_email");
    if (contract_id) {
      contractQuery = contractQuery.eq("id", contract_id);
    } else {
      contractQuery = contractQuery.eq("public_token", token);
    }
    const { data: contract } = await contractQuery.single();

    const allowed = ["draft", "pending_signatures"].includes(contract?.status || "");
    if (!contract || !allowed) {
      return new Response(JSON.stringify({ error: "Contract is not available for signature." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (signerType === "freelancer") {
      const authHeader = req.headers.get("authorization") || "";
      if (!authHeader.startsWith("Bearer ")) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const anonClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } },
      );
      const { data: authData } = await anonClient.auth.getUser();
      if (!authData.user || authData.user.id !== contract.user_id) {
        return new Response(JSON.stringify({ error: "Only the contract owner can complete freelancer signature." }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const nowIso = new Date().toISOString();
    const { data: signToken } = await supabase
      .from("contract_sign_tokens")
      .select("id, expires_at, used_at")
      .eq("contract_id", contract.id)
      .eq("code", code)
      .is("used_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!signToken) {
      return new Response(JSON.stringify({ error: "Invalid code." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (new Date(signToken.expires_at).getTime() < Date.now()) {
      return new Response(JSON.stringify({ error: "Code expired. Request a new code." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error: tokenUpdateError } = await supabase
      .from("contract_sign_tokens")
      .update({ used_at: nowIso })
      .eq("id", signToken.id)
      .is("used_at", null);
    if (tokenUpdateError) {
      return new Response(JSON.stringify({ error: tokenUpdateError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const updatePayload: Record<string, string | boolean | null> =
      signerType === "freelancer"
        ? {
            freelancer_signed_at: nowIso,
            freelancer_signed_name: signer_name || null,
            freelancer_email: signer_email || null,
            freelancer_tax_id: signer_tax_id || null,
            freelancer_sign_ip: signer_ip || null,
            freelancer_sign_geo: signer_geo || null,
            freelancer_sign_device: signer_device || null,
            freelancer_sign_isp: signer_isp || null,
            freelancer_sign_email_verified: !!email_verified,
          }
        : {
            client_signed_at: nowIso,
            client_signed_name: signer_name || null,
            client_email: signer_email || null,
            client_tax_id: signer_tax_id || null,
            client_sign_ip: signer_ip || null,
            client_sign_geo: signer_geo || null,
            client_sign_device: signer_device || null,
            client_sign_isp: signer_isp || null,
            client_sign_email_verified: !!email_verified,
          };
    const hasFreelancer = signerType === "freelancer" ? true : !!contract.freelancer_signed_at;
    const hasClient = signerType === "client" ? true : !!contract.client_signed_at;
    if (hasFreelancer && hasClient) {
      updatePayload.status = "signed";
    } else if (signerType === "freelancer" && contract.status === "draft") {
      updatePayload.status = "draft";
    } else {
      updatePayload.status = "pending_signatures";
    }
    const { error: contractUpdateError } = await supabase
      .from("contracts")
      .update(updatePayload)
      .eq("id", contract.id);

    if (contractUpdateError) {
      return new Response(JSON.stringify({ error: contractUpdateError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (signerType === "client" && contract.client_id) {
      await supabase.from("clients").update({ status: "Active" } as never).eq("id", contract.client_id);
    }

    // Notify both parties when contract is fully signed (uses standard client email template).
    if (updatePayload.status === "signed" && Deno.env.get("RESEND_API_KEY") && RESEND_FROM_EMAIL.includes("@")) {
      try {
        const { data: fresh } = await supabase
          .from("contracts")
          .select("identifier, public_token, user_id, freelancer_email, client_email")
          .eq("id", contract.id)
          .single();

        if (fresh?.user_id) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("business_name, business_email, email, full_name, business_logo, client_email_primary_color, client_email_header_html, client_email_footer_html")
            .eq("user_id", fresh.user_id)
            .maybeSingle();

          const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
          const primaryColor = (profile?.client_email_primary_color || "#9B63E9").trim();
          const fromDisplayName = (profile?.business_name || profile?.full_name || "Your Business").trim();
          const replyToEmail = (profile?.business_email || profile?.email || "").trim();
          const logoUrl = normalizeLogoUrl(profile?.business_logo || "", supabaseUrl);
          const baseUrl = APP_BASE_URL;
          const contractUrl = baseUrl ? `${baseUrl}/contract/${fresh.public_token}` : "";

          const safeIdentifier = escapeHtml(fresh.identifier);
          const coreHtml = `
            <h2 style="color: ${primaryColor}; margin-top: 0;">Contract ${safeIdentifier} signed</h2>
            <p style="color: #333;">The contract has been signed by both parties.</p>
            ${
              contractUrl
                ? `<p style="margin: 24px 0;">
                    <a href="${escapeHtml(contractUrl)}" style="display: inline-block; background: ${primaryColor}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px;">Open contract</a>
                  </p>
                  <p style="color: #999; font-size: 12px;">Or copy this link: ${escapeHtml(contractUrl)}</p>`
                : ""
            }
          `;

          const tokens = {
            business_name: escapeHtml(fromDisplayName),
            logo_url: logoUrl,
            primary_color: primaryColor,
            body_html: coreHtml,
            contract_id: safeIdentifier,
            contract_url: escapeHtml(contractUrl),
          };
          const headerTpl = (profile?.client_email_header_html || "").trim();
          const footerTpl = (profile?.client_email_footer_html || "").trim();
          const header = headerTpl ? replaceTokens(headerTpl, tokens) : getDefaultClientHeader(logoUrl, fromDisplayName, primaryColor);
          const footer = footerTpl ? replaceTokens(footerTpl, tokens) : getDefaultClientFooter(primaryColor);
          const emailHtml = `${header}${coreHtml}${footer}`;

          const recipients = [fresh.freelancer_email, fresh.client_email]
            .map((x) => (x || "").trim())
            .filter(Boolean);
          const uniqueRecipients = Array.from(new Set(recipients));
          if (uniqueRecipients.length > 0) {
            await resend.emails.send({
              from: `${fromDisplayName} <${RESEND_FROM_EMAIL}>`,
              to: uniqueRecipients,
              subject: `Contract ${fresh.identifier} signed`,
              html: emailHtml,
              ...(replyToEmail ? { reply_to: replyToEmail } : {}),
            });
          }
        }
      } catch {
        // Email failures should not block signature completion.
      }
    }

    return new Response(JSON.stringify({ success: true, status: updatePayload.status }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
