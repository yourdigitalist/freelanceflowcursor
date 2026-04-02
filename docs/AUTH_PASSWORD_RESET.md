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

## 6) Clicking reset link opens the dashboard (skips new password)

That should **not** happen. Common cause: the recovery tokens land on **`/`** (site root) instead of **`/reset-password`**. The home route then treats you as signed in and sends you to the dashboard.

- In **Authentication → URL Configuration**, keep **`https://getlance.app/reset-password`** allowed (or `https://getlance.app/**`).
- The app includes **`RecoveryHashRedirect`** so if a recovery link still hits `/` with a hash, you are sent to `/reset-password` before the dashboard redirect.

## 7) Styling + spam (looks plain vs review emails)

- **Styling:** Password reset content is controlled in **Authentication → Email Templates → Reset password**. Use the Lance-branded HTML in [`EMAIL_TEMPLATE_SUPABASE.html`](./EMAIL_TEMPLATE_SUPABASE.html) and follow [`EMAIL_TEMPLATE_README.md`](./EMAIL_TEMPLATE_README.md) (replace logo URL, then paste into Supabase).
- **Spam:** Auth mail uses **SMTP through Supabase**; review emails use the **Resend API**. They can land differently. Match **sender** to your transactional mail, use the styled template, and see [EMAIL_TEMPLATE_README.md § spam](EMAIL_TEMPLATE_README.md#why-auth-email-went-to-spam-but-review-requests-didnt).
