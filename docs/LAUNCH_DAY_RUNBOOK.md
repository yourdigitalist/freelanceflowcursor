# Launch day runbook (10 minutes)

## 1) Quick health checks (2 minutes)
- Open Admin → System check: `/admin/system-check`
  - Run **Send test email** (trial reminder test mode)
  - Run **Stripe health check**

## 2) Transactional email checks (5 minutes)
- **Review request**
  - Create a new approval with your own email as a recipient
  - Confirm email arrives and the review link opens correctly
- **Invoice**
  - Send an invoice to yourself
  - Confirm the PDF attachment opens on desktop + mobile
- **Auth email**
  - Trigger “Forgot password”
  - Confirm the reset link opens on the correct production domain

## 3) Monitoring pass (2 minutes)
- Supabase Dashboard → Edge Functions logs:
  - `send-review-request`, `send-invoice`, `send-trial-reminders`, `stripe-webhook`
- Resend Dashboard → email logs/events: verify no spikes in errors/bounces
- Stripe Dashboard → Webhooks: confirm events are being received (if billing is live)

## 4) Final sanity (1 minute)
- Confirm Framer landing page CTA goes to the production app domain
- Confirm no “dev” sender address is being used for email (`RESEND_FROM_EMAIL` set)

