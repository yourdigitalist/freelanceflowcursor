// @ts-nocheck
// Supabase Edge Function: send announcement to all active users (in-app + optional email).
// Requires RESEND_API_KEY for email. Call with Authorization: Bearer <user JWT> (admin only).
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, content-type",
};

function escapeHtml(text: string | null | undefined): string {
  if (!text) return "";
  return String(text)
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

function getDefaultLanceHeader(logoUrl: string, primaryColor: string): string {
  return `<div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
  <div style="padding: 18px 20px; background: ${primaryColor}; color: white;">
    <div style="display: flex; align-items: center; gap: 10px;">
      ${logoUrl ? `<img src="${logoUrl}" alt="Lance" style="height: 28px; max-width: 140px; object-fit: contain;" />` : `<strong style="font-size: 18px;">Lance</strong>`}
    </div>
  </div>
  <div style="padding: 20px;">`;
}

function getDefaultLanceFooter(primaryColor: string): string {
  return `</div><div style="padding: 14px 20px; font-size: 12px; color: #6b7280; border-top: 1px solid #e5e7eb;">
  Sent by <span style="color: ${primaryColor}; font-weight: 600;">Lance</span>
</div></div>`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Missing or invalid Authorization header" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: profile } = await userClient
    .from("profiles")
    .select("is_admin")
    .single();

  if (!profile?.is_admin) {
    return new Response(JSON.stringify({ error: "Forbidden: admin only" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: { title?: string; body?: string; link?: string; send_email?: boolean };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (!title) {
    return new Response(JSON.stringify({ error: "title is required" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const bodyText = typeof body.body === "string" ? body.body.trim() : "";
  const link = typeof body.link === "string" ? body.link.trim() : "";
  const sendEmail = !!body.send_email;

  if (sendEmail && !Deno.env.get("RESEND_API_KEY")) {
    return new Response(JSON.stringify({ error: "RESEND_API_KEY not set; cannot send email" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

  const { data: profiles, error: fetchError } = await serviceClient
    .from("profiles")
    .select("user_id, email, full_name")
    .eq("onboarding_completed", true);

  if (fetchError) {
    console.error("Fetch profiles error:", fetchError);
    return new Response(JSON.stringify({ error: fetchError.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const recipients = (profiles || []).filter((p) => {
    const e = (p.email as string) || "";
    return e.trim() !== "";
  });

  const notifications = recipients.map((p) => ({
    user_id: p.user_id,
    type: "announcement",
    title,
    body: bodyText || null,
    link: link || null,
  }));

  let inAppSent = 0;
  const BATCH = 100;
  for (let i = 0; i < notifications.length; i += BATCH) {
    const batch = notifications.slice(i, i + BATCH);
    const { error: insertError } = await serviceClient.from("notifications").insert(batch);
    if (insertError) {
      console.error("Insert notifications error:", insertError);
      return new Response(
        JSON.stringify({ error: insertError.message, in_app_sent: inAppSent }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    inAppSent += batch.length;
  }

  let emailsSent = 0;
  if (sendEmail) {
    const appName = "Lance";
    const safeTitle = escapeHtml(title);
    const safeLink = link ? escapeHtml(link) : "";

    const [{ data: branding }, { data: comms }] = await Promise.all([
      serviceClient
        .from("app_branding")
        .select("logo_url, primary_color")
        .eq("id", 1)
        .maybeSingle(),
      serviceClient
        .from("app_comms_defaults")
        .select("email_header_html, email_footer_html, lance_email_header_html, lance_email_footer_html, announcement_default_body, announcement_custom_html")
        .eq("id", 1)
        .maybeSingle(),
    ]);

    const primaryColor = (branding?.primary_color as string | null) || "#9B63E9";
    const logoUrl = (branding?.logo_url as string | null) || "";
    const headerTpl = (comms?.lance_email_header_html as string | null) || (comms?.email_header_html as string | null) || "";
    const footerTpl = (comms?.lance_email_footer_html as string | null) || (comms?.email_footer_html as string | null) || "";
    const customTpl = (comms?.announcement_custom_html as string | null) || "";
    const defaultAnnouncementBody = (comms?.announcement_default_body as string | null) || "You have a new announcement.";

    for (const p of recipients) {
      const email = (p.email as string).trim();
      const name = (p.full_name as string) || "there";
      const bodySource = bodyText || defaultAnnouncementBody;
      const safeBody = escapeHtml(bodySource).replace(/\n/g, "<br>");
      const bodyBlock = safeLink
        ? `<p>Hi ${escapeHtml(name)},</p><p>${safeBody}</p><p><a href="${safeLink}">View announcement</a></p>`
        : `<p>Hi ${escapeHtml(name)},</p><p>${safeBody}</p>`;
      const tokens = {
        user_name: escapeHtml(name),
        title: safeTitle,
        body_html: bodyBlock,
        announcement_body: safeBody,
        link: safeLink,
        logo_url: logoUrl,
        primary_color: primaryColor,
      };
      const customHtml = customTpl.trim()
        ? replaceTokens(customTpl, tokens)
        : "";
      const header = headerTpl.trim()
        ? replaceTokens(headerTpl, tokens)
        : getDefaultLanceHeader(logoUrl, primaryColor);
      const footer = footerTpl.trim()
        ? replaceTokens(footerTpl, tokens)
        : getDefaultLanceFooter(primaryColor);
      const html = customHtml || `${header}<h2 style="margin: 0 0 12px; color: ${primaryColor};">${safeTitle}</h2>${bodyBlock}${footer}`;

      const { error: sendError } = await resend.emails.send({
        from: `${appName} <onboarding@resend.dev>`,
        to: email,
        subject: title,
        html,
      });
      if (sendError) {
        console.error("Announcement email error:", sendError);
      } else {
        emailsSent++;
      }
    }
  }

  return new Response(
    JSON.stringify({ in_app_sent: inAppSent, emails_sent: emailsSent }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
