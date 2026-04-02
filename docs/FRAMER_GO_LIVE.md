# Framer landing page go-live checklist

## Domain + HTTPS
- Landing domain points to Framer and loads over HTTPS.
- App domain points to your app host and loads over HTTPS.
- No mixed-content warnings in the browser console.

## CTA handoff (landing → app)
- Primary CTA links to the correct production app URL (not preview, not localhost).
- If you have multiple CTAs (top nav, hero, pricing), verify **all** of them.
- UTM parameters are preserved (e.g. `?utm_source=...`) when clicking into the app.

## Email capture (if you have a form)
Decide where leads go and test the entire loop:
- **Where stored**: Resend audience/segment, Supabase table, or another CRM.
- **Double opt-in** (optional): confirm the confirmation email sends and links correctly.
- **Spam protection**: basic bot protection (Framer built-in, reCAPTCHA, or rate limiting) if needed.

## Analytics (minimum viable)
- Verify your analytics script(s) are installed on the landing page (GA, PostHog, etc.).
- Verify conversion events (CTA click / signup) are firing.

