import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Rate limiting configuration
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const RATE_LIMIT_MAX_REQUESTS = 100; // 100 requests per token per hour

async function checkRateLimit(supabase: any, key: string): Promise<{ allowed: boolean; remaining: number }> {
  const windowStart = new Date(Math.floor(Date.now() / RATE_LIMIT_WINDOW_MS) * RATE_LIMIT_WINDOW_MS).toISOString();
  
  // Try to increment existing record or insert new one
  const { data: existing } = await supabase
    .from("rate_limits")
    .select("id, count")
    .eq("key", key)
    .gte("window_start", windowStart)
    .single();

  if (existing) {
    if (existing.count >= RATE_LIMIT_MAX_REQUESTS) {
      return { allowed: false, remaining: 0 };
    }
    await supabase
      .from("rate_limits")
      .update({ count: existing.count + 1 })
      .eq("id", existing.id);
    return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS - existing.count - 1 };
  } else {
    await supabase
      .from("rate_limits")
      .insert({ key, count: 1, window_start: windowStart });
    return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS - 1 };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { token } = await req.json();

    if (!token) {
      return new Response(
        JSON.stringify({ error: "Token is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Rate limiting check
    const rateLimitKey = `get-review:${token}`;
    const { allowed, remaining } = await checkRateLimit(supabase, rateLimitKey);
    
    if (!allowed) {
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded. Try again later." }),
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

    // Get review request by share token
    const { data: request, error: requestError } = await supabase
      .from("review_requests")
      .select(`
        id,
        title,
        description,
        version,
        status,
        due_date
      `)
      .eq("share_token", token)
      .single();

    if (requestError || !request) {
      return new Response(
        JSON.stringify({ error: "Review not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get files
    const { data: files } = await supabase
      .from("review_files")
      .select("id, file_url, file_name, file_type")
      .eq("review_request_id", request.id);

    // Generate signed URLs for files (bucket is now private)
    const filesWithSignedUrls = await Promise.all(
      (files || []).map(async (file: any) => {
        // Extract the path from the file_url
        const urlParts = file.file_url.split("/review-files/");
        if (urlParts.length === 2) {
          const filePath = urlParts[1];
          const { data: signedData } = await supabase.storage
            .from("review-files")
            .createSignedUrl(filePath, 3600); // 1 hour expiry
          
          return {
            ...file,
            file_url: signedData?.signedUrl || file.file_url
          };
        }
        return file;
      })
    );

    // Get comments
    const { data: comments } = await supabase
      .from("review_comments")
      .select("*")
      .eq("review_request_id", request.id)
      .order("created_at");

    return new Response(
      JSON.stringify({ 
        request, 
        files: filesWithSignedUrls, 
        comments: comments || [] 
      }),
      { 
        headers: { 
          ...corsHeaders, 
          "Content-Type": "application/json",
          "X-RateLimit-Remaining": String(remaining)
        } 
      }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
