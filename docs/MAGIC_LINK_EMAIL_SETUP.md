# Magic link sign-in: emails not arriving

If users don’t receive the magic link email, the usual cause is **Supabase’s default email limits** or missing **custom SMTP**.

## Why it happens

Supabase’s built-in email (no custom SMTP) is for testing only:

- **Rate limit:** Only a small number of emails per hour (e.g. 2).
- **Recipients:** Often only pre-authorized / team emails work.
- **Delivery:** No guarantee; many providers filter or block it.

So in production you should **always use custom SMTP** for auth emails (magic link, confirm signup, reset password).

## Fix: use custom SMTP in Supabase

1. Open **Supabase Dashboard** → your project → **Project Settings** (gear) → **Authentication**.
2. Scroll to **SMTP Settings**.
3. **Enable custom SMTP** and enter your provider’s details, for example:
   - **Host:** e.g. `smtpout.secureserver.net` (GoDaddy), or your provider’s SMTP host.
   - **Port:** usually `465` (SSL) or `587` (TLS).
   - **User / password:** your SMTP credentials.
   - **Sender email:** the “From” address (e.g. `hello@getlance.app`).
   - **Sender name:** e.g. “Get Lance”.
4. Save. Supabase will use this for **all** auth emails, including **Magic Link**.

## After enabling SMTP

- Send a magic link again and ask the user to check **spam/junk**.
- In Supabase: **Authentication** → **Logs** (or **Auth logs**) and look for the magic-link request and any SMTP/email errors.
- Ensure the **Magic Link** email template exists and looks correct under **Authentication** → **Email Templates** (you can use the same Stripe-style frame as in `EMAIL_TEMPLATE_SUPABASE.html`; the link variable is `{{ .ConfirmationURL }}`).

## Rate limits

Even with custom SMTP, Supabase may rate limit how often magic links can be sent (e.g. per email address). If the app shows success but no email arrives, wait a bit and try again, and check Auth logs for rate-limit or other errors.
