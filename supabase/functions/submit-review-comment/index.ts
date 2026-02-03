import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Rate limiting configuration
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const RATE_LIMIT_MAX_COMMENTS = 20; // 20 comments per email per review per hour

async function checkRateLimit(supabase: any, key: string, maxRequests: number): Promise<{ allowed: boolean; remaining: number }> {
  const windowStart = new Date(Math.floor(Date.now() / RATE_LIMIT_WINDOW_MS) * RATE_LIMIT_WINDOW_MS).toISOString();
  
  const { data: existing } = await supabase
    .from("rate_limits")
    .select("id, count")
    .eq("key", key)
    .gte("window_start", windowStart)
    .single();

  if (existing) {
    if (existing.count >= maxRequests) {
      return { allowed: false, remaining: 0 };
    }
    await supabase
      .from("rate_limits")
      .update({ count: existing.count + 1 })
      .eq("id", existing.id);
    return { allowed: true, remaining: maxRequests - existing.count - 1 };
  } else {
    await supabase
      .from("rate_limits")
      .insert({ key, count: 1, window_start: windowStart });
    return { allowed: true, remaining: maxRequests - 1 };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { token, review_file_id, content, commenter_name, commenter_email, x_position, y_position } = await req.json();

    // Validate required fields
    if (!token) {
      return new Response(
        JSON.stringify({ error: "Token is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!content || content.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "Comment content is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate content length
    if (content.length > 2000) {
      return new Response(
        JSON.stringify({ error: "Comment must be less than 2000 characters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate commenter info
    if (!commenter_name || commenter_name.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "Name is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (commenter_name.length > 100) {
      return new Response(
        JSON.stringify({ error: "Name must be less than 100 characters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!commenter_email || !emailRegex.test(commenter_email)) {
      return new Response(
        JSON.stringify({ error: "Valid email is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (commenter_email.length > 255) {
      return new Response(
        JSON.stringify({ error: "Email must be less than 255 characters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Rate limiting check - per email per review
    const rateLimitKey = `comment:${commenter_email.toLowerCase()}:${token}`;
    const { allowed, remaining } = await checkRateLimit(supabase, rateLimitKey, RATE_LIMIT_MAX_COMMENTS);
    
    if (!allowed) {
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
        { 
          status: 429, 
          headers: { 
            ...corsHeaders, 
            "Content-Type": "application/json",
            "Retry-After": "3600",
            "X-RateLimit-Remaining": "0"
          } 
        }
      );
    }

    // Validate share token and get review request
    const { data: request, error: requestError } = await supabase
      .from("review_requests")
      .select("id, status")
      .eq("share_token", token)
      .single();

    if (requestError || !request) {
      console.error("Invalid token:", requestError);
      return new Response(
        JSON.stringify({ error: "Invalid or expired review link" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If review_file_id provided, validate it belongs to this request
    if (review_file_id) {
      const { data: file, error: fileError } = await supabase
        .from("review_files")
        .select("id")
        .eq("id", review_file_id)
        .eq("review_request_id", request.id)
        .single();

      if (fileError || !file) {
        return new Response(
          JSON.stringify({ error: "Invalid file reference" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Insert comment
    const { data: comment, error: commentError } = await supabase
      .from("review_comments")
      .insert({
        review_request_id: request.id,
        review_file_id: review_file_id || null,
        content: content.trim(),
        commenter_name: commenter_name.trim(),
        commenter_email: commenter_email.trim().toLowerCase(),
        x_position: x_position ?? null,
        y_position: y_position ?? null,
      })
      .select()
      .single();

    if (commentError) {
      console.error("Error inserting comment:", commentError);
      return new Response(
        JSON.stringify({ error: "Failed to add comment" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update request status to 'commented' if it was 'pending'
    if (request.status === "pending") {
      await supabase
        .from("review_requests")
        .update({ status: "commented" })
        .eq("id", request.id);
    }

    console.log(`Comment added to review ${request.id} by ${commenter_email}`);

    return new Response(
      JSON.stringify({ success: true, comment }),
      { 
        headers: { 
          ...corsHeaders, 
          "Content-Type": "application/json",
          "X-RateLimit-Remaining": String(remaining)
        } 
      }
    );
  } catch (error: unknown) {
    console.error("Error in submit-review-comment:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
