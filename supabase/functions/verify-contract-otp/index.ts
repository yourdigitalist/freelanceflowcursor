import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";
import {
  buildLanceUserEmail,
  escapeHtml,
  getLanceFromAddress,
  getLanceSignature,
  loadLanceEmailComms,
} from "../_shared/lance-email.ts";
import {
  channelEnabled,
  getContractPrefs,
  type NotificationPreferences,
  upsertUserNotification,
} from "../_shared/user-notification.ts";
import { resolveSignerNetworkMetadata } from "../_shared/signer-metadata.ts";

declare const EdgeRuntime: {
  waitUntil: (promise: Promise<unknown>) => void;
};

function normalizeOtpCode(code: unknown): string {
  return String(code ?? "").replace(/\D/g, "").slice(0, 6);
}

function normalizeEmail(email: unknown): string {
  return String(email ?? "").trim().toLowerCase();
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const RESEND_FROM_EMAIL = (Deno.env.get("RESEND_FROM_EMAIL") || "onboarding@resend.dev").trim();
const APP_BASE_URL = (Deno.env.get("APP_BASE_URL") || "").trim().replace(/\/$/, "");

function replaceTokens(template: string, tokens: Record<string, string>): string {
  return Object.entries(tokens).reduce((out, [key, value]) => {
    const re = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, "gi");
    return out.replace(re, value);
  }, template);
}

const EMAIL_COMMS_CONFIG_PREFIX = "LANCE_EMAIL_CONFIG::";
function parseEmailCommsConfig(raw: string | null | undefined): { logoLight: string; logoDark: string; logoVariant: "light" | "dark" } {
  const fallback = { logoLight: "", logoDark: "", logoVariant: "light" as const };
  const text = (raw || "").trim();
  if (!text.startsWith(EMAIL_COMMS_CONFIG_PREFIX)) return fallback;
  try {
    const parsed = JSON.parse(text.slice(EMAIL_COMMS_CONFIG_PREFIX.length));
    const logoLight = typeof parsed?.logoDefault === "string"
      ? parsed.logoDefault
      : typeof parsed?.logoLight === "string"
        ? parsed.logoLight
        : "";
    const logoDark = typeof parsed?.logoSecondary === "string"
      ? parsed.logoSecondary
      : typeof parsed?.logoDark === "string"
        ? parsed.logoDark
        : "";
    return {
      logoLight,
      logoDark,
      logoVariant: parsed?.logoVariant === "dark" ? "dark" : "light",
    };
  } catch {
    return fallback;
  }
}

function getDefaultClientHeader(logoUrl: string, businessName: string, primaryColor: string): string {
  return `<div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
  <div style="padding: 18px 20px; background: ${primaryColor}; color: white;">
    ${logoUrl ? `<img src="${logoUrl}" alt="${escapeHtml(businessName)}" style="height: 28px; max-width: 160px; object-fit: contain;" />` : `<strong style="font-size: 18px;">${escapeHtml(businessName)}</strong>`}
  </div>
  <div style="padding: 20px;">`;
}

function getDefaultClientFooter(primaryColor: string, businessName: string, businessEmail: string): string {
  const safeName = escapeHtml(businessName || "Your Business");
  const safeEmail = escapeHtml(businessEmail || "");
  return `</div><div style="padding: 14px 20px; font-size: 12px; color: #6b7280; border-top: 1px solid #e5e7eb;">
  Sent by <span style="color: ${primaryColor}; font-weight: 600;">${safeName}</span>${safeEmail ? ` · <span>${safeEmail}</span>` : ""}
</div></div>`;
}

function normalizeLogoUrl(rawLogo: string, supabaseUrl: string): string {
  const trimmed = (rawLogo || "").trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
  const base = (supabaseUrl || "").replace(/\/$/, "");
  return `${base}${trimmed.startsWith("/") ? trimmed : `/${trimmed}`}`;
}

async function runPostSignNotifications(
  supabase: ReturnType<typeof createClient>,
  contract: {
    id: string;
    identifier: string | null;
    user_id: string;
    client_id: string | null;
  },
  signerType: "freelancer" | "client",
  finalStatus: string,
) {
  const contractLabel = contract.identifier ? `Contract ${contract.identifier}` : "Contract";
  const contractLink = `/contracts/${contract.id}`;
  const { data: ownerProfile } = await supabase
    .from("profiles")
    .select("email, business_email, notification_preferences")
    .eq("user_id", contract.user_id)
    .maybeSingle();
  const contractPrefs = getContractPrefs(
    (ownerProfile?.notification_preferences as NotificationPreferences | null) || null,
  );
  const ownerNotifyEmail = (ownerProfile?.business_email || ownerProfile?.email || "").trim();

  if (finalStatus === "signed") {
    if (channelEnabled(contractPrefs?.fullySigned, "inApp")) {
      await upsertUserNotification(supabase, {
        user_id: contract.user_id,
        type: "contract",
        title: "Contract fully signed",
        body: `${contractLabel} has been signed by both parties.`,
        link: contractLink,
        event_key: `contract_fully_signed:${contract.id}`,
      });
    }
  } else if (signerType === "freelancer") {
    if (channelEnabled(contractPrefs?.freelancerSigned, "inApp")) {
      await upsertUserNotification(supabase, {
        user_id: contract.user_id,
        type: "contract",
        title: "You signed the contract",
        body: `${contractLabel}: awaiting client signature.`,
        link: contractLink,
        event_key: `contract_freelancer_signed:${contract.id}`,
      });
    }
  } else if (signerType === "client") {
    if (channelEnabled(contractPrefs?.clientSigned, "inApp")) {
      await upsertUserNotification(supabase, {
        user_id: contract.user_id,
        type: "contract",
        title: "Client signed contract",
        body: `${contractLabel}: the client has signed. Complete your signature if required.`,
        link: contractLink,
        event_key: `contract_client_signed:${contract.id}`,
      });
    }
    if (
      channelEnabled(contractPrefs?.clientSigned, "email") &&
      ownerNotifyEmail &&
      Deno.env.get("RESEND_API_KEY") &&
      RESEND_FROM_EMAIL.includes("@")
    ) {
      try {
        const lanceComms = await loadLanceEmailComms(supabase);
        const openUrl = `${APP_BASE_URL}${contractLink}`;
        const subject = `Client signed: ${contract.identifier || "Contract"}`;
        const text = `${contractLabel} was signed by the client.\n\nOpen: ${openUrl}`;
        const contentHtml = `<h2 style="margin:0 0 12px;font-size:18px;color:${escapeHtml(lanceComms.primaryColor)};">${escapeHtml(subject)}</h2>
<p style="margin:0 0 20px;color:#374151;">${escapeHtml(contractLabel)} was signed by the client.</p>
<p style="margin:0;"><a href="${escapeHtml(openUrl)}" style="display:inline-block;background:${escapeHtml(lanceComms.primaryColor)};color:#ffffff !important;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">Open contract</a></p>`;
        const html = buildLanceUserEmail(lanceComms, contentHtml, {}, ownerNotifyEmail);
        await resend.emails.send({
          from: getLanceFromAddress(),
          to: ownerNotifyEmail,
          subject,
          text,
          html,
        });
      } catch (e) {
        console.error("client signed email failed:", e);
      }
    }
  }

  if (
    finalStatus === "signed" &&
    channelEnabled(contractPrefs?.fullySigned, "email") &&
    Deno.env.get("RESEND_API_KEY") &&
    RESEND_FROM_EMAIL.includes("@")
  ) {
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
        const contractUrl = APP_BASE_URL ? `${APP_BASE_URL}/contract/${fresh.public_token}` : "";

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
        const footerTpl = (profile?.client_email_footer_html || "").trim();
        const commsConfig = parseEmailCommsConfig(profile?.client_email_header_html);
        const selectedRawLogo = commsConfig.logoVariant === "dark"
          ? (commsConfig.logoDark || profile?.business_logo || commsConfig.logoLight || "")
          : (profile?.business_logo || commsConfig.logoLight || commsConfig.logoDark || "");
        const selectedLogoUrl = normalizeLogoUrl(selectedRawLogo, supabaseUrl);
        const header = getDefaultClientHeader(selectedLogoUrl || logoUrl, fromDisplayName, primaryColor);
        const footer = footerTpl ? replaceTokens(footerTpl, tokens) : getDefaultClientFooter(primaryColor, fromDisplayName, replyToEmail);
        const emailHtml = `${header}${coreHtml}${footer}${getLanceSignature(primaryColor)}`;

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
    const normalizedCode = normalizeOtpCode(code);
    const normalizedSignerEmail = normalizeEmail(signer_email);
    if ((!token && !contract_id) || !normalizedCode || normalizedCode.length !== 6) {
      return new Response(JSON.stringify({ error: "Token/contract_id and a valid 6-digit code are required" }), {
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
    const baseTokenQuery = () =>
      supabase
        .from("contract_sign_tokens")
        .select("id, expires_at, used_at, email")
        .eq("contract_id", contract.id)
        .eq("code", normalizedCode)
        .is("used_at", null)
        .gt("expires_at", nowIso)
        .order("created_at", { ascending: false })
        .limit(1);

    let signToken = null as { id: string; expires_at: string; used_at: string | null; email: string } | null;
    if (normalizedSignerEmail) {
      const { data } = await baseTokenQuery().eq("email", normalizedSignerEmail).maybeSingle();
      signToken = data;
    }
    if (!signToken) {
      const { data } = await baseTokenQuery().maybeSingle();
      signToken = data;
    }

    if (!signToken) {
      return new Response(JSON.stringify({ error: "Invalid or expired code. Request a new code." }), {
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

    const network = await resolveSignerNetworkMetadata(req, {
      ip: typeof signer_ip === "string" ? signer_ip : null,
      geo: typeof signer_geo === "string" ? signer_geo : null,
      isp: typeof signer_isp === "string" ? signer_isp : null,
    });

    const updatePayload: Record<string, string | boolean | null> =
      signerType === "freelancer"
        ? {
            freelancer_signed_at: nowIso,
            freelancer_signed_name: signer_name || null,
            freelancer_tax_id: signer_tax_id || null,
            freelancer_sign_ip: network.ip,
            freelancer_sign_geo: network.geo,
            freelancer_sign_device: signer_device || null,
            freelancer_sign_isp: network.isp,
            freelancer_sign_email_verified: !!email_verified,
          }
        : {
            client_signed_at: nowIso,
            client_signed_name: signer_name || null,
            client_tax_id: signer_tax_id || null,
            client_sign_ip: network.ip,
            client_sign_geo: network.geo,
            client_sign_device: signer_device || null,
            client_sign_isp: network.isp,
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
      await supabase
        .from("contract_sign_tokens")
        .update({ used_at: null })
        .eq("id", signToken.id);
      return new Response(JSON.stringify({ error: contractUpdateError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (signerType === "client" && contract.client_id) {
      await supabase.from("clients").update({ status: "Active" } as never).eq("id", contract.client_id);
    }

    const finalStatus = updatePayload.status as string;
    const notifyTask = runPostSignNotifications(
      supabase,
      contract,
      signerType,
      finalStatus,
    ).catch((error) => {
      console.error("verify-contract-otp notify failed:", error);
    });
    if (typeof EdgeRuntime !== "undefined") {
      EdgeRuntime.waitUntil(notifyTask);
    } else {
      void notifyTask;
    }

    return new Response(JSON.stringify({ success: true, status: finalStatus }), {
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
