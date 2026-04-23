import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { token, comment_id, commenter_email } = await req.json();

    if (!token) {
      return new Response(JSON.stringify({ error: "Token is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!comment_id) {
      return new Response(JSON.stringify({ error: "Comment id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const normalizedEmail = (commenter_email || "").trim().toLowerCase();
    if (!normalizedEmail) {
      return new Response(JSON.stringify({ error: "Commenter email is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: request, error: requestError } = await supabase
      .from("review_requests")
      .select("id")
      .eq("share_token", token)
      .single();

    if (requestError || !request) {
      return new Response(JSON.stringify({ error: "Invalid or expired review link" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: existingComment, error: existingError } = await supabase
      .from("review_comments")
      .select("id")
      .eq("id", comment_id)
      .eq("review_request_id", request.id)
      .eq("commenter_email", normalizedEmail)
      .single();

    if (existingError || !existingComment) {
      return new Response(JSON.stringify({ error: "Comment not found or permission denied" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error: deleteError } = await supabase
      .from("review_comments")
      .delete()
      .eq("id", comment_id);

    if (deleteError) {
      console.error("Failed to delete review comment", deleteError);
      return new Response(JSON.stringify({ error: "Failed to delete comment" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
