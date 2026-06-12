// @ts-nocheck
// Supabase Edge Function: send announcement to all active users (in-app + optional email).
// Requires RESEND_API_KEY for email. Call with Authorization: Bearer <user JWT> (admin only).
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { Resend } from "https://esm.sh/resend@2.0.0";
import {
  buildAnnouncementEmail,
  buildLanceUserEmail,
  escapeHtml,
  getLanceFromAddress,
  getLanceUserFirstName,
  getResendFromEmail,
  loadLanceEmailComms,
  replaceTokens,
} from "../_shared/lance-email.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, content-type",
};

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
    .select("user_id, email, full_name, first_name")
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
    const [{ data: comms }, lanceComms] = await Promise.all([
      serviceClient
        .from("app_comms_defaults")
        .select("announcement_custom_html")
        .eq("id", 1)
        .maybeSingle(),
      loadLanceEmailComms(serviceClient),
    ]);

    const primaryColor = lanceComms.primaryColor;
    const customTpl = (comms?.announcement_custom_html as string | null) || "";

    for (const p of recipients) {
      const email = (p.email as string).trim();
      const displayName = (p.first_name as string) || (p.full_name as string) || null;
      const announcement = buildAnnouncementEmail({
        title,
        body: bodyText,
        fullName: displayName,
        link: link || undefined,
        ctaLabel: link ? "Learn more" : undefined,
        primaryColor,
      });
      const firstName = getLanceUserFirstName(displayName);
      const customHtml = customTpl.trim()
        ? replaceTokens(customTpl, {
          user_name: escapeHtml(firstName),
          title: escapeHtml(title),
          body_html: announcement.contentHtml,
          announcement_body: escapeHtml(bodyText).replace(/\n/g, "<br>"),
          link: link ? escapeHtml(link) : "",
          primary_color: primaryColor,
        })
        : "";
      const html = customHtml || buildLanceUserEmail(lanceComms, announcement.contentHtml, {}, email);

      const { error: sendError } = await resend.emails.send({
        from: getLanceFromAddress(getResendFromEmail()),
        to: email,
        subject: announcement.subject,
        text: announcement.text,
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
