// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import {
  buildAllEmailPreviews,
  fetchAuthEmailConfig,
  type EmailPreviewTemplate,
} from "../_shared/email-previews.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });

  try {
    const authHeader = req.headers.get("authorization") || "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: authData, error: authError } = await userClient.auth.getUser();
    if (authError || !authData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const serviceClient = createClient(supabaseUrl, serviceKey);
    const { data: adminProfile } = await serviceClient
      .from("profiles")
      .select("is_admin")
      .eq("user_id", authData.user.id)
      .maybeSingle();
    if (!adminProfile?.is_admin) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: profile } = await serviceClient
      .from("profiles")
      .select(
        "full_name, email, business_name, business_email, business_logo, client_email_primary_color, client_email_header_html, client_email_footer_html, currency, currency_display, number_format",
      )
      .eq("user_id", authData.user.id)
      .maybeSingle();

    const { data: commsRow } = await serviceClient
      .from("app_comms_defaults")
      .select(
        "trial_body_5d, trial_body_1d, trial_body_0d, announcement_default_body, announcement_custom_html, account_deleted_subject, account_deleted_body, invoice_email_subject_default, invoice_email_message_default, reminder_subject_default, reminder_body_default",
      )
      .eq("id", 1)
      .maybeSingle();

    const { config: authConfig, error: authConfigError } = await fetchAuthEmailConfig();

    const templates: EmailPreviewTemplate[] = await buildAllEmailPreviews(
      serviceClient,
      profile || { full_name: authData.user.email, email: authData.user.email },
      commsRow,
      authConfig,
    );

    return new Response(
      JSON.stringify({
        templates,
        profile: {
          name: profile?.full_name || authData.user.email,
          email: profile?.email || authData.user.email,
          business_name: profile?.business_name || null,
        },
        auth_templates_available: Boolean(authConfig),
        auth_templates_error: authConfigError || null,
        counts: {
          auth: templates.filter((t) => t.category === "auth").length,
          lance_to_user: templates.filter((t) => t.category === "lance_to_user").length,
          user_to_client: templates.filter((t) => t.category === "user_to_client").length,
          internal: templates.filter((t) => t.category === "internal").length,
          total: templates.length,
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
