import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Allowed MIME types and their valid extensions
const ALLOWED_TYPES: Record<string, string[]> = {
  'image/jpeg': ['jpg', 'jpeg'],
  'image/png': ['png'],
  'image/gif': ['gif'],
  'image/webp': ['webp'],
  'application/pdf': ['pdf'],
  'application/msword': ['doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['docx'],
};

// Magic bytes for file type verification
const MAGIC_BYTES: Record<string, number[][]> = {
  'image/jpeg': [[0xFF, 0xD8, 0xFF]],
  'image/png': [[0x89, 0x50, 0x4E, 0x47]],
  'image/gif': [[0x47, 0x49, 0x46, 0x38]],
  'image/webp': [[0x52, 0x49, 0x46, 0x46]], // RIFF header
  'application/pdf': [[0x25, 0x50, 0x44, 0x46]], // %PDF
};

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB

// Rate limiting configuration
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const RATE_LIMIT_MAX_UPLOADS = 20; // 20 files per user per hour

function sanitizeFilename(filename: string): string {
  // Remove path traversal attempts and dangerous characters
  return filename
    .replace(/\.\./g, '')
    .replace(/[/\\:*?"<>|]/g, '')
    .replace(/\s+/g, '_')
    .substring(0, 255);
}

function getFileExtension(filename: string): string {
  const parts = filename.split('.');
  return parts.length > 1 ? parts.pop()!.toLowerCase() : '';
}

async function verifyMagicBytes(file: ArrayBuffer, mimeType: string): Promise<boolean> {
  const signatures = MAGIC_BYTES[mimeType];
  if (!signatures) return true; // Skip check for types without magic bytes (doc, docx)
  
  const bytes = new Uint8Array(file.slice(0, 12));
  
  return signatures.some(signature => 
    signature.every((byte, index) => bytes[index] === byte)
  );
}

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
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify user with anon key (respects RLS)
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = claimsData.claims.sub as string;

    // Use service role for all operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Rate limiting check
    const rateLimitKey = `upload:${userId}`;
    const { allowed, remaining } = await checkRateLimit(supabase, rateLimitKey, RATE_LIMIT_MAX_UPLOADS);
    
    if (!allowed) {
      return new Response(
        JSON.stringify({ error: 'Upload rate limit exceeded. Please try again later.' }),
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

    // Parse multipart form data
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const reviewRequestId = formData.get('review_request_id') as string | null;

    if (!file) {
      return new Response(
        JSON.stringify({ error: 'No file provided' }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!reviewRequestId) {
      return new Response(
        JSON.stringify({ error: 'Review request ID is required' }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // === VALIDATION ===

    // 1. Check file size
    if (file.size > MAX_FILE_SIZE) {
      return new Response(
        JSON.stringify({ error: `File too large. Maximum size is 2MB` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (file.size === 0) {
      return new Response(
        JSON.stringify({ error: 'File is empty' }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Check MIME type
    const mimeType = file.type;
    if (!ALLOWED_TYPES[mimeType]) {
      return new Response(
        JSON.stringify({ error: `File type not allowed. Allowed types: images (JPEG, PNG, GIF, WebP), PDF, Word documents` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Sanitize and validate filename
    const sanitizedName = sanitizeFilename(file.name);
    const extension = getFileExtension(sanitizedName);
    
    if (!extension) {
      return new Response(
        JSON.stringify({ error: 'File must have an extension' }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4. Verify extension matches MIME type
    const validExtensions = ALLOWED_TYPES[mimeType];
    if (!validExtensions.includes(extension)) {
      return new Response(
        JSON.stringify({ error: `File extension doesn't match file type. Expected: ${validExtensions.join(', ')}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 5. Verify magic bytes (file content header)
    const fileBuffer = await file.arrayBuffer();
    const magicBytesValid = await verifyMagicBytes(fileBuffer, mimeType);
    
    if (!magicBytesValid) {
      return new Response(
        JSON.stringify({ error: 'File content does not match its declared type' }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 6. Verify user owns the review request
    const { data: request, error: requestError } = await supabase
      .from('review_requests')
      .select('id')
      .eq('id', reviewRequestId)
      .eq('user_id', userId)
      .single();

    if (requestError || !request) {
      return new Response(
        JSON.stringify({ error: 'Review request not found or access denied' }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // === UPLOAD ===
    const filePath = `${userId}/${reviewRequestId}/${crypto.randomUUID()}.${extension}`;
    
    const { error: uploadError } = await supabase.storage
      .from('review-files')
      .upload(filePath, fileBuffer, {
        contentType: mimeType,
        upsert: false,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return new Response(
        JSON.stringify({ error: 'Failed to upload file' }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Store file path for signed URL generation later (bucket is now private)
    // Format: supabase storage URL structure for compatibility
    const fileUrl = `${supabaseUrl}/storage/v1/object/review-files/${filePath}`;

    // Insert file record
    const { data: fileRecord, error: dbError } = await supabase
      .from('review_files')
      .insert({
        review_request_id: reviewRequestId,
        user_id: userId,
        file_url: fileUrl,
        file_name: sanitizedName,
        file_type: mimeType,
        file_size: file.size,
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      // Try to clean up uploaded file
      await supabase.storage.from('review-files').remove([filePath]);
      return new Response(
        JSON.stringify({ error: 'Failed to save file record' }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`File uploaded: ${sanitizedName} (${file.size} bytes) by user ${userId}`);

    return new Response(
      JSON.stringify({ success: true, file: fileRecord }),
      { 
        headers: { 
          ...corsHeaders, 
          "Content-Type": "application/json",
          "X-RateLimit-Remaining": String(remaining)
        } 
      }
    );

  } catch (error: unknown) {
    console.error('Error in upload-review-file:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
