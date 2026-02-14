# Stripe billing setup

Standard SaaS flow: **Checkout** for subscribing, **Customer Billing Portal** for managing (update payment, cancel, invoices). Your app already uses both; ensure the following.

## 1. Environment variables

**Frontend (`.env`):**
- `VITE_STRIPE_PRICE_MONTHLY` – Stripe Price ID for monthly plan (e.g. `price_xxx`)
- `VITE_STRIPE_PRICE_ANNUAL` – Stripe Price ID for annual plan

**Supabase Edge Function secrets** (Dashboard → Project Settings → Edge Functions → Secrets):
- `STRIPE_SECRET_KEY` – Stripe secret key (e.g. `sk_live_xxx` or `sk_test_xxx`)
- `STRIPE_WEBHOOK_SECRET` – Signing secret from Stripe Dashboard → Webhooks (e.g. `whsec_xxx`)

## 2. Enable and configure the Customer portal

The “Open billing portal” link only works if the **Stripe Customer portal** is enabled and configured.

1. In **Stripe Dashboard** go to **Settings → Billing → Customer portal**  
   Direct link: [dashboard.stripe.com/settings/billing/portal](https://dashboard.stripe.com/settings/billing/portal)
2. Turn the portal **on** if it isn’t already.
3. Under **Subscriptions** and **Cancellations**, choose what customers can do (e.g. cancel subscription, update payment method). Defaults are usually fine.
4. Save.

Without this, creating a portal session can fail or redirect to an inactive page.

## 3. Webhook (so subscription status stays in sync)

1. **Stripe Dashboard → Developers → Webhooks → Add endpoint**
2. **Endpoint URL:**  
   `https://<your-supabase-project-ref>.supabase.co/functions/v1/stripe-webhook`
3. **Events to send:** at least  
   - `checkout.session.completed` (sets `stripe_customer_id` and subscription on your `profiles`)
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
4. Copy the **Signing secret** (`whsec_...`) and set it as `STRIPE_WEBHOOK_SECRET` in Supabase Edge Function secrets.

## 4. Default Checkout (optional)

To change how Checkout looks (branding, payment methods):

- **Stripe Dashboard → Settings → Billing → Checkout settings**  
  Configure brand, payment methods, and default options.
- For more control you can use [Stripe Checkout appearance](https://docs.stripe.com/payments/checkout/customization) or pass `custom_text` / `custom_fields` when creating the session in `create-checkout-session`.

## Quick checklist

- [ ] `VITE_STRIPE_PRICE_MONTHLY` and `VITE_STRIPE_PRICE_ANNUAL` in `.env`
- [ ] `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` in Supabase Edge Function secrets
- [ ] Customer portal enabled: **Stripe Dashboard → Settings → Billing → Customer portal**
- [ ] Webhook added in Stripe with URL `.../functions/v1/stripe-webhook` and events above
- [ ] Trial reminders: run `send-trial-reminders` daily (see section 5 below)
- [ ] User has completed Checkout at least once (so `stripe_customer_id` is set); then “Open billing portal” works
