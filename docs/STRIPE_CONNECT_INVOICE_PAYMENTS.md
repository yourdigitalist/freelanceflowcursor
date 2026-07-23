# Stripe Connect — client invoice payments (test mode)

Collect card payments on freelancer invoices via **Stripe Connect**, isolated from Lance SaaS subscription billing.

## Isolation from Lance billing

| Concern | Env / code |
|--------|------------|
| Lance subscriptions (live ads OK) | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `create-checkout-session`, `stripe-webhook` |
| Invoice Pay now (test only) | `STRIPE_CONNECT_SECRET_KEY` (**must** be `sk_test_…`), `STRIPE_CONNECT_WEBHOOK_SECRET`, Connect edge functions |

Connect code **refuses** to start if `STRIPE_CONNECT_SECRET_KEY` is not a test key. Freelancer fees are charged by Stripe on their connected account; Lance takes **0%** application fee.

## What you need in Stripe (test mode)

1. Open [Stripe Dashboard → Test mode](https://dashboard.stripe.com/test/dashboard).
2. Enable **Connect** (Settings → Connect → Get started).
3. Prefer **Standard** accounts where Stripe bills connected accounts for processing fees ([Connect pricing](https://stripe.com/connect/pricing) — “Stripe sets and collects…”).
4. Create a **webhook** (Developers → Webhooks) in **test** mode:
   - URL: `https://<project-ref>.supabase.co/functions/v1/stripe-connect-webhook`
   - Listen to events on **Connected accounts** as well as your account
   - Events:
     - `checkout.session.completed`
     - `account.updated`
     - `account.application.deauthorized`
   - Copy signing secret → `STRIPE_CONNECT_WEBHOOK_SECRET`
5. Set redirect URLs for Connect onboarding to include:
   - `https://<your-app-origin>/settings/payments?connect=return`
   - `https://<your-app-origin>/settings/payments?connect=refresh`
   - Local: `http://localhost:5173/settings/payments?connect=return` (and refresh)

## Supabase secrets

```bash
supabase secrets set STRIPE_CONNECT_SECRET_KEY=sk_test_...
supabase secrets set STRIPE_CONNECT_WEBHOOK_SECRET=whsec_...
# APP_BASE_URL should already be set for emails
```

Deploy functions:

```bash
supabase functions deploy create-connect-account-link
supabase functions deploy disconnect-connect-account
supabase functions deploy create-invoice-payment-session
supabase functions deploy stripe-connect-webhook
supabase functions deploy send-invoice
supabase functions deploy view-client-portal
```

Apply migration:

```bash
supabase db push
# or run supabase/migrations/20260717140000_stripe_connect_invoice_payments.sql
```

## Freelancer UX

**Admin-only for now.** Settings → **Client payments** is hidden for non-admins; Connect APIs return 403 for non-admins. Normal invoice send/PDF/email is unchanged for everyone.

1. Settings → **Client payments**
2. Tick acknowledgement (Stripe fees, not Lance) + link to [stripe.com/pricing](https://stripe.com/pricing)
3. **Connect Stripe (test)** → Stripe onboarding
4. When status is **Ready to collect**, sending an invoice adds a **Pay now** button in the email (and portal if a payment URL exists)

## Client UX

- Email: Pay now → Stripe Checkout (test cards: `4242…`)
- Portal invoice page: Pay now when outstanding + URL present
- Webhook marks invoice `paid` with `payment_method: card`

## Related docs

- SaaS billing (unchanged): [STRIPE_BILLING_SETUP.md](./STRIPE_BILLING_SETUP.md)
- Fees overview for users: https://stripe.com/pricing
