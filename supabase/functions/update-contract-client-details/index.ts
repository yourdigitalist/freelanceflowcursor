import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { token, clientData } = await req.json();
    if (!token || !clientData) {
      return new Response(JSON.stringify({ error: "Token and clientData are required" }), {
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
      .select("id, status")
      .eq("public_token", token)
      .single();

    if (!contract) {
      return new Response(JSON.stringify({ error: "Contract not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!["pending_signatures", "draft"].includes(contract.status)) {
      return new Response(JSON.stringify({ error: "Contract cannot be updated in this status" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = {
      client_entity_type: clientData.client_entity_type || "individual",
      client_name: clientData.client_name || null,
      client_company: clientData.client_company || null,
      client_email: clientData.client_email || null,
      client_phone: clientData.client_phone || null,
      client_address: clientData.client_address || null,
      client_street: clientData.client_street || clientData.client_address || null,
      client_street2: clientData.client_street2 || null,
      client_city: clientData.client_city || null,
      client_state: clientData.client_state || null,
      client_zip: clientData.client_zip || null,
      client_country: clientData.client_country || null,
      client_tax_id: clientData.client_tax_id || null,
    };

    let { data: updated, error } = await supabase
      .from("contracts")
      .update(payload)
      .eq("id", contract.id)
      .select("*")
      .single();

    if (error && /column .* does not exist/i.test(error.message || "")) {
      const fallbackPayload = {
        client_entity_type: clientData.client_entity_type || "individual",
        client_name: clientData.client_name || null,
        client_email: clientData.client_email || null,
        client_phone: clientData.client_phone || null,
        client_address: clientData.client_address || null,
        client_city: clientData.client_city || null,
        client_state: clientData.client_state || null,
        client_zip: clientData.client_zip || null,
        client_country: clientData.client_country || null,
      };
      const retry = await supabase
        .from("contracts")
        .update(fallbackPayload)
        .eq("id", contract.id)
        .select("*")
        .single();
      updated = retry.data;
      error = retry.error;
    }

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ contract: updated }), {
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
