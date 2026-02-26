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

## 5. Coupon / promotion code with free trial (e.g. “don’t charge after trial”)

Checkout has **promotion codes** enabled (`allow_promotion_codes: true`). Customers can enter a code at Stripe Checkout. **Stripe applies the coupon to the subscription**, including the first invoice *after* the trial. So if the coupon is **100% off**, when the 15-day trial ends the first invoice will be **$0** and the customer is not charged (the subscription stays active and they keep access).

**To test the full flow (trial + no charge after trial):**

1. **Stripe Dashboard → Products → Coupons → Create coupon**
   - **Type:** Percentage off → **100%**, or Amount off → full price of your plan.
   - **Duration:** “Forever” (or “Once” if you only want the first post-trial invoice free).
   - **Applies to:** Your subscription product/price (or leave unrestricted).
   - Save.

2. **Stripe Dashboard → Products → Promotion codes → Create promotion code**
   - Choose the coupon you created.
   - Set a **code** (e.g. `TEST100` or `FREETRIAL`) and optional expiry/limits.
   - Save.

3. At checkout, the customer (or you, when testing) enters that promotion code. The subscription is created with the coupon attached.

4. When the 15-day trial ends, Stripe creates the first paid invoice, applies the 100% discount, and **does not charge** the card (amount due is $0). The subscription remains active.

So you do **not** need to change any code: the coupon applies automatically after the trial. If you still see a charge, check that (a) the coupon is 100% off (or covers the full amount), (b) the promotion code was applied at checkout (you should see the discount on the Checkout summary), and (c) the coupon is valid for your price (currency, product).

## 6. Trial reminder emails (optional)

The **webhook** (section 3) is what keeps your app’s subscription and trial data in sync when users complete checkout or when Stripe updates subscriptions. Your “FreelanceFlow subscription sync” endpoint is that webhook—once it’s configured and the signing secret is in Supabase, you’re done on the Stripe side.

**Trial reminder emails** are separate: the `send-trial-reminders` Edge Function sends emails (“5 days left”, “1 day left”, “trial ends today”). Stripe does **not** call this function. To send those emails, you need to **run it once per day** yourself, for example:

- A cron job (e.g. [cron-job.org](https://cron-job.org), GitHub Actions) that runs daily and does:  
  `POST https://<your-project-ref>.supabase.co/functions/v1/send-trial-reminders`  
  with header `Authorization: Bearer <your-anon-key>`.
- Or Supabase scheduled functions / pg_cron if you use them.

If you don’t set this up, trial users still see in-app reminders (banner and sidebar); they just won’t get **email** reminders. Full details: [TRIAL_REMINDERS.md](./TRIAL_REMINDERS.md).

## Quick checklist

- [ ] `VITE_STRIPE_PRICE_MONTHLY` and `VITE_STRIPE_PRICE_ANNUAL` in `.env`
- [ ] `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` in Supabase Edge Function secrets
- [ ] Customer portal enabled: **Stripe Dashboard → Settings → Billing → Customer portal**
- [ ] Webhook added in Stripe with URL `.../functions/v1/stripe-webhook` and events above
- [ ] **(Optional)** Trial reminder **emails**: schedule a daily run of `send-trial-reminders` (see section 6 above)
- **Note:** “Open billing portal” only works for users who have completed Checkout at least once (webhook then sets `stripe_customer_id`). No extra setup needed from you.
