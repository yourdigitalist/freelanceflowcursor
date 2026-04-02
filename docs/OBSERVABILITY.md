# Observability (go-live)

## Where to look when something fails

### Supabase Edge Functions
- **Logs**: Supabase Dashboard → **Edge Functions** → select function → **Logs**
- Key functions for launch:
  - `send-review-request`
  - `send-invoice`
  - `send-trial-reminders`
  - `stripe-webhook`
  - `billing-health` (sanity check)

### Resend (transactional email)
- **Events / message status**: Resend Dashboard → Emails / Logs
- When investigating:
  - Confirm SPF/DKIM/DMARC pass for the sending domain
  - Check for bounces/blocks and which recipient provider rejected
  - Use returned `messageId` from API responses where available

### Stripe (billing)
- **Webhooks**: Stripe Dashboard → Developers → Webhooks → endpoint → Events
- If users can’t subscribe:
  - Confirm `create-checkout-session` is returning a URL (Edge Function logs)
  - Confirm `stripe-webhook` is receiving `checkout.session.completed` in production

## Controlled failure tests (recommended)

- **Rate limit**:
  - Attempt to send many review request emails quickly and confirm the UI shows a friendly error when the Edge Function returns `429`.
- **Bad recipient**:
  - Send an invoice to an obviously invalid email and confirm you see a clear error in Edge Function logs and Resend.

