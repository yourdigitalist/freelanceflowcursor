export function isEmailVerified(user: { email_confirmed_at?: string | null }): boolean {
  return !!user.email_confirmed_at;
}

export function emailVerificationRequiredResponse(
  corsHeaders: Record<string, string>,
): Response {
  return new Response(
    JSON.stringify({
      error:
        "Verify your email before sending to clients. Go to Settings → Profile to resend the verification link.",
    }),
    {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  );
}
