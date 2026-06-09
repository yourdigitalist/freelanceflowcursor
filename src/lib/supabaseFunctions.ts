/** Parse Supabase Edge Function invoke errors (including non-2xx response bodies). */
export async function readFunctionErrorMessage(
  error: unknown,
  fallback: string,
  data?: { error?: string } | null,
): Promise<string> {
  if (data?.error) return data.error;
  if (error && typeof error === "object" && "context" in error) {
    try {
      const response = (error as { context?: Response }).context;
      if (response) {
        const body = (await response.json()) as { error?: string };
        if (body?.error) return body.error;
      }
    } catch {
      // Ignore parse issues and use fallback below.
    }
  }
  if (error && typeof error === "object" && "message" in error) {
    const message = String((error as { message?: unknown }).message || "").trim();
    if (message && !message.includes("non-2xx")) return message;
  }
  return fallback;
}

export function normalizeOtpCode(code: unknown): string {
  return String(code ?? "").replace(/\D/g, "").slice(0, 6);
}

export function normalizeEmail(email: unknown): string {
  return String(email ?? "").trim().toLowerCase();
}
