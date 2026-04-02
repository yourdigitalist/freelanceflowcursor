# Supabase Auth emails — Lance styling

Auth emails (password reset, magic link, confirm signup) are edited in **Supabase Dashboard → Authentication → Email Templates**. They are **not** sent by the app’s Resend Edge Functions, but you can make them **look the same** by using the shared HTML frame in [`EMAIL_TEMPLATE_SUPABASE.html`](./EMAIL_TEMPLATE_SUPABASE.html).

## Do this once

1. **Logo URL**  
   In **Admin → Branding**, copy your **logo** full URL (must be `https://...`).  
   In `EMAIL_TEMPLATE_SUPABASE.html`, replace **`REPLACE_WITH_LOGO_URL`** with that URL (same URL you’d use anywhere else).  
   If you change the logo later, update it in **each** Supabase template that uses this file.

2. **Paste the full HTML** into each auth template body  
   Open **Authentication → Email Templates** and, for **Reset password**, **Magic link**, and **Confirm signup** (and any others you use), paste the full file, then **replace only the “MAIN CONTENT” block** using the snippets below.

3. **Subjects (optional)**  
   In each template, set a clear subject, e.g.  
   - Reset: `Reset your Lance password`  
   - Magic link: `Your Lance sign-in link`  
   - Confirm: `Confirm your email for Lance`

## Main content blocks (swap the commented section in the HTML file)

### Reset password

Use the default block already in `EMAIL_TEMPLATE_SUPABASE.html` (heading “Reset your password”, button “Reset password”, `{{ .ConfirmationURL }}`).

### Magic link

Replace the MAIN CONTENT block with:

```html
      <h2 style="margin: 0 0 16px 0; font-size: 18px; color: #9B63E9;">Sign in to Lance</h2>
      <p style="margin: 0 0 16px 0;">Hi,</p>
      <p style="margin: 0 0 20px 0;">Click the button below to sign in to your account. This link is for one-time use.</p>
      <p style="margin: 0 0 24px 0;">
        <a href="{{ .ConfirmationURL }}" style="display: inline-block; background: #9B63E9; color: #ffffff !important; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">Sign in</a>
      </p>
      <p style="margin: 0 0 12px 0; font-size: 13px; color: #6b7280;">If the button doesn’t work, copy and paste this link:</p>
      <p style="margin: 0; font-size: 12px; word-break: break-all; color: #6b7280;">{{ .ConfirmationURL }}</p>
      <p style="margin: 24px 0 0 0; font-size: 14px; color: #374151;">If you didn’t request this email, you can ignore it.</p>
```

### Confirm signup

Replace the MAIN CONTENT block with:

```html
      <h2 style="margin: 0 0 16px 0; font-size: 18px; color: #9B63E9;">Confirm your email</h2>
      <p style="margin: 0 0 16px 0;">Hi,</p>
      <p style="margin: 0 0 20px 0;">Thanks for signing up for Lance. Confirm your email address to get started.</p>
      <p style="margin: 0 0 24px 0;">
        <a href="{{ .ConfirmationURL }}" style="display: inline-block; background: #9B63E9; color: #ffffff !important; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">Confirm email</a>
      </p>
      <p style="margin: 0 0 12px 0; font-size: 13px; color: #6b7280;">If the button doesn’t work, copy and paste this link:</p>
      <p style="margin: 0; font-size: 12px; word-break: break-all; color: #6b7280;">{{ .ConfirmationURL }}</p>
      <p style="margin: 24px 0 0 0; font-size: 14px; color: #374151;">If you didn’t create an account, you can ignore this email.</p>
```

Always keep **`{{ .ConfirmationURL }}`** exactly as Supabase expects (variable name may differ for your project—match the **default** template for that email type).

## Why auth email went to spam but review requests didn’t

- **Different pipeline:** Review requests use the **Resend API** from Edge Functions. Auth mail uses **SMTP through Supabase** (even if Resend is the provider). Headers and routing can differ slightly.
- **Content:** “Password reset” messages are filtered more aggressively by Gmail and others.
- **Fix checklist**
  1. In **Supabase → Authentication → SMTP**, set **Sender email** to the **same** verified domain address you use for transactional mail (e.g. `hello@getlance.app`), and **Sender name** `Lance` (or your product name).
  2. Ensure **SPF/DKIM** for that domain are valid in Resend (you already verified the domain).
  3. Use the **styled HTML** above so the message looks legitimate (not bare default text).
  4. In Gmail, **“Report not spam”** once—this trains the mailbox for future messages.
  5. Avoid testing the same reset flow dozens of times in a row (rate + reputation).

## Resend API key for SMTP vs Edge Functions

You can use the **same** Resend API key for:

- **Supabase Edge Function secret** `RESEND_API_KEY` (HTTP API for invoices/reviews), and  
- **Supabase SMTP password** (when using Resend’s SMTP with username `resend`).

Resend does **not** show full keys again in the dashboard after creation. If you didn’t save it, **create a new API key**, update both places, and revoke the old key if needed.

Resend SMTP (typical):

- Host: `smtp.resend.com`
- Port: `465` (SSL) or `587` (TLS)
- Username: `resend`
- Password: your `re_...` API key

Confirm current values in [Resend’s documentation](https://resend.com/docs).
