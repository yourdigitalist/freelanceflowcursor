// @ts-nocheck
import type Stripe from "https://esm.sh/stripe@14.21.0?target=denonext";

/** Promotion codes / coupon names treated as beta (comp) access in admin metrics. */
export const BETA_PROMOTION_CODES = new Set(["betatesters", "mgtest", "mgtest2"]);

export function normalizePromotionCode(code: string | null | undefined): string | null {
  const trimmed = (code ?? "").trim();
  return trimmed ? trimmed : null;
}

export function isBetaPromotionCode(code: string | null | undefined): boolean {
  const normalized = (code ?? "").trim().toLowerCase();
  return normalized.length > 0 && BETA_PROMOTION_CODES.has(normalized);
}

function codeFromDiscount(discount: Stripe.Discount | string | null | undefined): string | null {
  if (!discount || typeof discount === "string") return null;

  const promo = discount.promotion_code;
  if (promo && typeof promo === "object" && "code" in promo && promo.code) {
    return normalizePromotionCode(promo.code);
  }

  const coupon = discount.coupon;
  if (coupon && typeof coupon === "object") {
    if (coupon.name) return normalizePromotionCode(coupon.name);
    if (coupon.id) return normalizePromotionCode(coupon.id);
  }

  return null;
}

function discountsFromSubscription(sub: Stripe.Subscription): Stripe.Discount[] {
  const found: Stripe.Discount[] = [];

  const legacy = sub.discount;
  if (legacy && typeof legacy === "object") found.push(legacy);

  const list = sub.discounts;
  if (Array.isArray(list)) {
    for (const item of list) {
      if (item && typeof item === "object") found.push(item);
    }
  } else if (list && typeof list === "object" && Array.isArray(list.data)) {
    for (const item of list.data) {
      if (item && typeof item === "object") found.push(item);
    }
  }

  return found;
}

/** Read the customer-facing promotion code from a Stripe subscription. */
export function promotionCodeFromSubscription(sub: Stripe.Subscription): string | null {
  for (const discount of discountsFromSubscription(sub)) {
    const code = codeFromDiscount(discount);
    if (code) return code;
  }
  return null;
}

export const SUBSCRIPTION_DISCOUNT_EXPANDS = [
  "discount.promotion_code",
  "discount.coupon",
] as const;
