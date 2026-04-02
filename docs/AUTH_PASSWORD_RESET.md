# Password reset email ("Forgot password") not sending

Recovery emails are sent by **Supabase Auth**, not by the app’s Resend Edge Functions. If the UI shows an error or no email arrives, work through this list.

## 1) Redirect URLs (very common)

The app calls `resetPasswordForEmail` with:

`redirectTo` = `https://<your-app-domain>/reset-password`

In **Supabase Dashboard → Authentication → URL Configuration**:

- **Site URL** should be your live app origin, e.g. `https://getlance.app`
- Under **Redirect URLs**, include at least one of:
  - `https://getlance.app/reset-password`
  - or a wildcard: `https://getlance.app/**`

If the redirect URL is not allowed, Supabase may reject the request or the link in the email may not work.

## 2) Frontend env: `VITE_SITE_URL`

Set in **Vercel** (and rebuild) so the redirect always uses production:

`VITE_SITE_URL=https://getlance.app`

If this is missing, the client falls back to `window.location.origin` (usually fine on the live site, but wrong if you test from another host).

## 3) SMTP (production)

Supabase’s built-in email is limited. For production, enable **custom SMTP**:

**Supabase Dashboard → Project Settings → Authentication → SMTP**

See also [MAGIC_LINK_EMAIL_SETUP.md](./MAGIC_LINK_EMAIL_SETUP.md) — the same SMTP applies to magic links, signup confirmation, and password reset.

## 4) Auth logs

**Supabase Dashboard → Authentication → Logs** (or project logs): look for errors when you trigger "Forgot password".

## 5) Rate limits

If you tested many times in a short period, wait and retry, or check logs for rate-limit messages.
