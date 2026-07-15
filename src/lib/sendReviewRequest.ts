import { supabase } from "@/integrations/supabase/client";
import { requireEmailVerified } from "@/lib/emailVerification";

export type SendReviewRequestResult = {
  success: boolean;
  messageId?: string;
};

/**
 * Email approval recipients via the send-review-request edge function.
 */
export async function sendReviewRequestEmail(
  reviewRequestId: string,
  origin?: string,
): Promise<SendReviewRequestResult> {
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  const sessionUser = sessionData.session?.user;
  const verify = requireEmailVerified(sessionUser);
  if (!verify.ok) {
    throw new Error(verify.message);
  }
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const anonKey =
    import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  if (!accessToken || !supabaseUrl) {
    throw new Error("Session not available. Please sign in again.");
  }

  const res = await fetch(`${supabaseUrl}/functions/v1/send-review-request`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      ...(anonKey ? { apikey: anonKey } : {}),
    },
    body: JSON.stringify({
      reviewRequestId,
      origin: origin || (typeof window !== "undefined" ? window.location.origin : ""),
    }),
  });

  const json = await res.json().catch(() => ({} as { error?: string; success?: boolean; messageId?: string }));
  if (!res.ok) {
    throw new Error(
      typeof json?.error === "string" ? json.error : `Could not send email (${res.status})`,
    );
  }
  if (json?.error) {
    throw new Error(json.error);
  }
  return { success: true, messageId: json.messageId };
}
