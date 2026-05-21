import { supabase } from "@/integrations/supabase/client";

export type ClientPortalLoadResult = {
  data: Record<string, unknown> | null;
  error: string | null;
};

/** Load portal payload for public /portal/:token (edge function; optional owner session for preview). */
export async function loadClientPortalData(
  token: string,
  options?: { preview?: boolean; invoiceId?: string },
): Promise<ClientPortalLoadResult> {
  const cleanToken = token.trim();
  if (!cleanToken) {
    return { data: null, error: "Invalid portal link." };
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const headers: Record<string, string> = {};
  if (session?.access_token) {
    headers.Authorization = `Bearer ${session.access_token}`;
  }

  const { data, error } = await supabase.functions.invoke("view-client-portal", {
    body: {
      token: cleanToken,
      preview: options?.preview === true,
      invoiceId: options?.invoiceId,
    },
    headers,
  });

  if (error) {
    const msg = error.message || "Could not reach the portal service.";
    if (/function not found|404|Failed to send/i.test(msg)) {
      return {
        data: null,
        error:
          "Portal service is not available yet. Deploy the view-client-portal edge function and apply the client portal database migration.",
      };
    }
    return { data: null, error: msg };
  }

  if (data && typeof data === "object" && "error" in data && data.error) {
    const errMsg = String((data as { error: string }).error);
    if (errMsg.toLowerCase().includes("not available")) {
      return {
        data: null,
        error:
          "This portal is disabled or the link is invalid. In the client Portal tab, turn the portal on and copy the link again.",
      };
    }
    return { data: null, error: errMsg };
  }

  return { data: data as Record<string, unknown>, error: null };
}
