# Email template (Stripe-style)

The template in `EMAIL_TEMPLATE_SUPABASE.html` is a clean, Stripe-style frame for auth and transactional emails.

## Colours (same as Stripe)

- **Outer background:** `#F1F5F9`
- **Card/content:** `#FFFFFF` (rounded 8px)
- **Footer strip:** `#F6F9FC`
- **Body text:** `#425466`
- **Footer text:** `#525F7F`
- **Links:** `#635BFF` (or `#525F7F` in footer)

## Logo

Replace `REPLACE_WITH_LOGO_URL` in the template with your logo URL:

- **Admin → Branding:** upload a logo, then copy the logo URL shown there (or from the app’s branding settings). Use that full URL as `REPLACE_WITH_LOGO_URL`.

Supabase Auth templates cannot read your database, so the logo is a fixed URL you set once. If you change the logo in Branding, update the URL in each Supabase email template that uses it.

## Footer links

The template footer includes:

- **Log in** → `{{ .SiteURL }}/auth`
- **Help** → `{{ .SiteURL }}/help`
- **Terms and conditions** → `{{ .SiteURL }}/terms`
- **Privacy policy** → `{{ .SiteURL }}/privacy`

Ensure **Site URL** in Supabase (Project Settings → Authentication) is your production app URL (e.g. `https://app.getlance.app`) so these links point to the right place.

## Using in Supabase

1. Open **Supabase Dashboard → Authentication → Email Templates**.
2. Choose a template (e.g. **Confirm signup**).
3. Paste the contents of `EMAIL_TEMPLATE_SUPABASE.html` into the **Body** (HTML).
4. Replace `REPLACE_WITH_LOGO_URL` with your branding logo URL.
5. For **Confirm signup**, the body section already uses `{{ .ConfirmationURL }}`. For **Magic Link** or **Reset password**, change the main paragraph to use `{{ .ConfirmationURL }}` (or the variable shown in the default template) and adjust the button/link text as needed.

## Other templates (Magic Link, Reset password)

Use the same HTML frame and only change the middle “main content” block:

- **Magic Link:** e.g. “Click here to sign in: {{ .ConfirmationURL }}”
- **Reset password:** e.g. “Reset your password: {{ .ConfirmationURL }}”

Supabase variable names are in the default template for each type; keep those when you swap the body text.
