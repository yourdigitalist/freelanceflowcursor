-- Stripe Connect (test-mode invoice collection) — separate from Lance SaaS billing columns.
-- Freelancer connected accounts pay Stripe processing fees; Lance does not take an application fee.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS stripe_connect_account_id text,
  ADD COLUMN IF NOT EXISTS stripe_connect_charges_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS stripe_connect_details_submitted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS stripe_connect_fees_acknowledged_at timestamptz,
  ADD COLUMN IF NOT EXISTS stripe_connect_connected_at timestamptz;

COMMENT ON COLUMN public.profiles.stripe_connect_account_id IS
  'Stripe Connect Standard account id (acct_…) for client invoice payment collection. Uses STRIPE_CONNECT_* test keys only — not SaaS billing.';
COMMENT ON COLUMN public.profiles.stripe_connect_charges_enabled IS
  'True when the connected account can accept charges (synced from Stripe account.updated).';
COMMENT ON COLUMN public.profiles.stripe_connect_details_submitted IS
  'True when Connect onboarding details were submitted.';
COMMENT ON COLUMN public.profiles.stripe_connect_fees_acknowledged_at IS
  'When the user acknowledged that Stripe (not Lance) charges processing fees.';
COMMENT ON COLUMN public.profiles.stripe_connect_connected_at IS
  'When the Connect account was first linked in Lance.';

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS stripe_checkout_session_id text,
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text,
  ADD COLUMN IF NOT EXISTS stripe_payment_url text,
  ADD COLUMN IF NOT EXISTS stripe_payment_amount_cents integer,
  ADD COLUMN IF NOT EXISTS stripe_payment_currency text;

COMMENT ON COLUMN public.invoices.stripe_checkout_session_id IS
  'Stripe Checkout Session id for Pay now (created on connected account).';
COMMENT ON COLUMN public.invoices.stripe_payment_intent_id IS
  'Stripe PaymentIntent id after Checkout completes (optional).';
COMMENT ON COLUMN public.invoices.stripe_payment_url IS
  'Hosted Checkout URL for the client to pay this invoice.';
COMMENT ON COLUMN public.invoices.stripe_payment_amount_cents IS
  'Amount (minor units) baked into the Checkout Session; recreate link if invoice total changes.';
COMMENT ON COLUMN public.invoices.stripe_payment_currency IS
  'ISO currency of the Checkout Session.';

CREATE INDEX IF NOT EXISTS invoices_stripe_checkout_session_id_idx
  ON public.invoices (stripe_checkout_session_id)
  WHERE stripe_checkout_session_id IS NOT NULL;
