import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DEFAULT_CONTRACT_TEMPLATE_CONTENT = `FREELANCE SERVICES AGREEMENT

Contract ID: {{identifier}}
Date: {{today}}

1. Parties
{{client_identification}}
{{freelancer_identification}}

2. Scope of Services
The Service Provider agrees to deliver the following services:
{{services}}
Project reference: {{project_name}}
Estimated timeline: {{timeline_days}}

3. Payment Terms
Total amount: {{total}}
Payment structure: {{payment_structure}}
Accepted payment methods:
{{payment_methods}}
{{installment_description}}
Payment link:
{{payment_link}}

4. Additional Clause
{{additional_clause}}

5. Signatures
Signed on {{signed_date}}.`;

type TemplateRow = { id: string; name: string; content: string; is_default?: boolean | null };

function resolveContractTemplateContent(templateId: string | null | undefined, templates: TemplateRow[]): string {
  if (templateId) {
    const selected = templates.find((t) => t.id === templateId);
    return selected?.content || DEFAULT_CONTRACT_TEMPLATE_CONTENT;
  }
  const serviceAgreement = templates.find((t) => t.name?.trim().toLowerCase() === "service agreement");
  const defaultTemplate = serviceAgreement || templates.find((t) => t.is_default) || templates[0];
  return defaultTemplate?.content || DEFAULT_CONTRACT_TEMPLATE_CONTENT;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { token, preview } = await req.json();
    if (!token) {
      return new Response(JSON.stringify({ error: "Token is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: contract } = await supabase
      .from("contracts")
      .select("*, projects(name)")
      .eq("public_token", token)
      .single();

    if (!contract) {
      return new Response(JSON.stringify({ error: "This contract is not available." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (contract.status === "draft" && !preview) {
      return new Response(JSON.stringify({ error: "This contract is not available." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (contract.status === "draft" && preview) {
      const authHeader = req.headers.get("authorization") || "";
      if (!authHeader.startsWith("Bearer ")) {
        return new Response(JSON.stringify({ error: "Unauthorized preview request." }), {
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
        return new Response(JSON.stringify({ error: "Unauthorized preview request." }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const [{ data: services }, { data: profile }, { data: templates }] = await Promise.all([
      supabase.from("contract_services").select("*").eq("contract_id", contract.id).order("sort_order"),
      supabase
        .from("profiles")
        .select(
          "full_name, email, business_name, business_phone, business_address, business_city, business_state, business_postal_code, business_country, business_street, business_street2, tax_id",
        )
        .eq("user_id", contract.user_id)
        .maybeSingle(),
      supabase
        .from("contract_templates")
        .select("id, name, content, is_default")
        .eq("user_id", contract.user_id)
        .order("created_at"),
    ]);

    const mergedContract = {
      ...contract,
      freelancer_name: contract.freelancer_name || profile?.full_name || null,
      freelancer_email: contract.freelancer_email || profile?.email || null,
      freelancer_company: contract.freelancer_company || profile?.business_name || null,
      freelancer_phone: contract.freelancer_phone || profile?.business_phone || null,
      freelancer_address: contract.freelancer_address || profile?.business_address || null,
      freelancer_city: contract.freelancer_city || profile?.business_city || null,
      freelancer_state: contract.freelancer_state || profile?.business_state || null,
      freelancer_zip: contract.freelancer_zip || profile?.business_postal_code || null,
      freelancer_country: contract.freelancer_country || profile?.business_country || null,
      freelancer_tax_id: contract.freelancer_tax_id || profile?.tax_id || null,
      freelancer_street: contract.freelancer_street || profile?.business_street || profile?.business_address || null,
      freelancer_street2: contract.freelancer_street2 || profile?.business_street2 || null,
    };

    const template_content = resolveContractTemplateContent(contract.template_id, templates || []);

    return new Response(
      JSON.stringify({
        contract: mergedContract,
        services: services || [],
        template_content,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
