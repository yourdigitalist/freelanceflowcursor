import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const RESEND_FROM_EMAIL = (Deno.env.get("RESEND_FROM_EMAIL") || "onboarding@resend.dev").trim();

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { token, email, signer_type, contract_id } = await req.json();
    const signerType = signer_type === "freelancer" ? "freelancer" : "client";
    if ((!token && !contract_id) || !email) {
      return new Response(JSON.stringify({ error: "Token/contract_id and email are required" }), {
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
      .select("id, identifier, status, user_id");
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
        return new Response(JSON.stringify({ error: "Only the contract owner can request freelancer OTP." }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const oneMinuteAgo = new Date(Date.now() - 60 * 1000).toISOString();
    const { data: lastToken } = await supabase
      .from("contract_sign_tokens")
      .select("created_at")
      .eq("contract_id", contract.id)
      .eq("email", email)
      .gte("created_at", oneMinuteAgo)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lastToken) {
      return new Response(JSON.stringify({ error: "Please wait one minute before requesting another code." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    const { error: insertError } = await supabase.from("contract_sign_tokens").insert({
      contract_id: contract.id,
      email,
      code,
      expires_at: expiresAt,
    });

    if (insertError) {
      return new Response(JSON.stringify({ error: insertError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!Deno.env.get("RESEND_API_KEY")) {
      return new Response(JSON.stringify({ error: "Email provider not configured." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await resend.emails.send({
      from: `Lance <${RESEND_FROM_EMAIL}>`,
      to: [email],
      subject: `Your ${signerType} signing code for contract ${contract.identifier}`,
      html: `<div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;padding:24px;border:1px solid #e5e7eb;border-radius:12px;">
        <h2 style="margin-top:0;color:#1f2937;">Contract verification code</h2>
        <p style="color:#4b5563;">Use the code below to sign contract <strong>${contract.identifier}</strong> as ${signerType}. This code expires in 10 minutes.</p>
        <div style="font-size:36px;font-weight:700;letter-spacing:8px;color:#111827;margin:18px 0;">${code}</div>
        <p style="font-size:12px;color:#6b7280;">If you did not request this code, ignore this email.</p>
      </div>`,
    });

    return new Response(JSON.stringify({ success: true }), {
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
