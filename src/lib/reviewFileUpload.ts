import { supabase } from "@/integrations/supabase/client";

/**
 * Upload a file to an approval (review) request via the validated edge function.
 */
export async function uploadReviewFile(file: File, reviewRequestId: string): Promise<void> {
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const anonKey =
    import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  if (!accessToken || !supabaseUrl) {
    throw new Error("Session not available. Please sign in again.");
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("review_request_id", reviewRequestId);

  const res = await fetch(`${supabaseUrl}/functions/v1/upload-review-file`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(anonKey ? { apikey: anonKey } : {}),
    },
    body: formData,
  });

  const json = await res.json().catch(() => ({} as { error?: string }));
  if (!res.ok) {
    throw new Error(
      typeof json?.error === "string" ? json.error : `Upload failed (${res.status})`,
    );
  }
  if (json?.error) {
    throw new Error(json.error);
  }
}
