/**
 * Stripe Connect helpers for invoice payment collection.
 * ALWAYS uses STRIPE_CONNECT_SECRET_KEY (must be sk_test_…) — never STRIPE_SECRET_KEY
 * so Lance SaaS live billing stays isolated.
 */
import Stripe from "https://esm.sh/stripe@14.21.0?target=denonext";

export const STRIPE_FEES_HELP_URL = "https://stripe.com/pricing";

/** Currencies with zero decimal places in Stripe. */
const ZERO_DECIMAL = new Set([
  "bif", "clp", "djf", "gnf", "jpy", "kmf", "krw", "mga", "pyg", "rwf", "ugx", "vnd", "vuv", "xaf", "xof", "xpf",
]);

export function getConnectStripe(): Stripe {
  const key = Deno.env.get("STRIPE_CONNECT_SECRET_KEY")?.trim();
  if (!key) {
    throw new Error("Stripe Connect is not configured (STRIPE_CONNECT_SECRET_KEY missing)");
  }
  if (!key.startsWith("sk_test_")) {
    throw new Error(
      "STRIPE_CONNECT_SECRET_KEY must be a test key (sk_test_…). Live keys are blocked so Connect cannot touch Lance SaaS billing.",
    );
  }
  return new Stripe(key, { apiVersion: "2023-10-16" });
}

export function isConnectReady(profile: {
  stripe_connect_account_id?: string | null;
  stripe_connect_charges_enabled?: boolean | null;
  stripe_connect_fees_acknowledged_at?: string | null;
}): boolean {
  return Boolean(
    profile.stripe_connect_account_id &&
      profile.stripe_connect_charges_enabled &&
      profile.stripe_connect_fees_acknowledged_at,
  );
}

export function toStripeAmountCents(total: number, currency: string): number {
  const code = (currency || "usd").toLowerCase();
  if (!Number.isFinite(total) || total <= 0) {
    throw new Error("Invoice total must be greater than zero to create a payment link");
  }
  if (ZERO_DECIMAL.has(code)) {
    return Math.round(total);
  }
  return Math.round(total * 100);
}

export function appBaseUrl(req: Request): string {
  const fromEnv = (Deno.env.get("APP_BASE_URL") || "").trim().replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  const origin = req.headers.get("origin") || req.headers.get("referer")?.replace(/\/$/, "") || "";
  if (origin) {
    try {
      return new URL(origin).origin;
    } catch {
      /* fall through */
    }
  }
  return "https://getlance.app";
}

export type EnsurePaymentSessionInput = {
  stripe: Stripe;
  supabase: { from: (t: string) => any };
  invoice: {
    id: string;
    invoice_number: string;
    total: number | null;
    status?: string | null;
    stripe_checkout_session_id?: string | null;
    stripe_payment_url?: string | null;
    stripe_payment_amount_cents?: number | null;
    stripe_payment_currency?: string | null;
    clients?: { name?: string | null; email?: string | null } | null;
  };
  userId: string;
  connectAccountId: string;
  currency: string;
  successUrl: string;
  cancelUrl: string;
};

/**
 * Create or reuse a Checkout Session on the freelancer's connected account.
 * Direct charge: fees are billed to the connected account by Stripe.
 */
export async function ensureInvoicePaymentSession(
  input: EnsurePaymentSessionInput,
): Promise<{ url: string; sessionId: string } | null> {
  const { stripe, supabase, invoice, userId, connectAccountId, currency, successUrl, cancelUrl } = input;
  const status = (invoice.status || "").toLowerCase();
  if (status === "paid" || status === "cancelled" || status === "canceled") {
    return null;
  }

  const currencyCode = (currency || "usd").toLowerCase();
  const amountCents = toStripeAmountCents(Number(invoice.total || 0), currencyCode);

  if (
    invoice.stripe_payment_url &&
    invoice.stripe_checkout_session_id &&
    invoice.stripe_payment_amount_cents === amountCents &&
    (invoice.stripe_payment_currency || "").toLowerCase() === currencyCode
  ) {
    return { url: invoice.stripe_payment_url, sessionId: invoice.stripe_checkout_session_id };
  }

  const clientEmail = (invoice.clients?.email || "").trim() || undefined;
  const description = `Invoice ${invoice.invoice_number}`;

  const session = await stripe.checkout.sessions.create(
    {
      mode: "payment",
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_email: clientEmail,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: currencyCode,
            unit_amount: amountCents,
            product_data: {
              name: description,
              description: `Payment for invoice ${invoice.invoice_number}`,
            },
          },
        },
      ],
      metadata: {
        lance_purpose: "invoice_payment",
        invoice_id: invoice.id,
        user_id: userId,
        invoice_number: String(invoice.invoice_number),
      },
      payment_intent_data: {
        metadata: {
          lance_purpose: "invoice_payment",
          invoice_id: invoice.id,
          user_id: userId,
        },
      },
    },
    { stripeAccount: connectAccountId },
  );

  if (!session.url) {
    throw new Error("Stripe Checkout did not return a URL");
  }

  const { error } = await supabase
    .from("invoices")
    .update({
      stripe_checkout_session_id: session.id,
      stripe_payment_url: session.url,
      stripe_payment_amount_cents: amountCents,
      stripe_payment_currency: currencyCode,
    })
    .eq("id", invoice.id)
    .eq("user_id", userId);

  if (error) {
    console.error("Failed to save invoice payment session:", error);
    throw new Error("Failed to save payment link on invoice");
  }

  return { url: session.url, sessionId: session.id };
}

export async function markInvoicePaidFromStripe(
  supabase: { from: (t: string) => any },
  invoiceId: string,
  paymentIntentId: string | null,
): Promise<void> {
  const paidAt = new Date().toISOString();
  const { data: inv, error: findErr } = await supabase
    .from("invoices")
    .select("id, status, user_id")
    .eq("id", invoiceId)
    .maybeSingle();
  if (findErr || !inv) {
    console.warn("markInvoicePaidFromStripe: invoice not found", invoiceId, findErr);
    return;
  }
  if ((inv.status || "").toLowerCase() === "paid") {
    if (paymentIntentId) {
      await supabase
        .from("invoices")
        .update({ stripe_payment_intent_id: paymentIntentId })
        .eq("id", invoiceId);
    }
    return;
  }

  const { error } = await supabase
    .from("invoices")
    .update({
      status: "paid",
      paid_date: paidAt,
      payment_method: "card",
      ...(paymentIntentId ? { stripe_payment_intent_id: paymentIntentId } : {}),
    })
    .eq("id", invoiceId);

  if (error) {
    console.error("markInvoicePaidFromStripe update failed:", error);
    throw error;
  }

  await supabase
    .from("time_entries")
    .update({ billing_status: "paid" })
    .eq("invoice_id", invoiceId);
}
