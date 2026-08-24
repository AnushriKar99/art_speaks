/**
 * Flat shipping fee shown before checkout, in paise. ₹80.
 *
 * Display only. The real charge is computed inside place_whatsapp_order
 * (migration 0017), which has its own copy of this same figure — the cart
 * page cannot deduct stock or write an order, so it has nothing to enforce
 * this value against and must not be trusted to. If the fee ever changes,
 * both this constant and the one in that migration have to move together, or
 * the cart's preview total will disagree with what the order actually
 * charges.
 */
export const SHIPPING_CENTS = 8000;

export interface Category {
  id: string;
  name: string;
  slug: string;
  /** hex border/accent colour used on the homepage category circles */
  accentColor: string;
  /** rgba/hex used for the offset shadow on the category circle */
  shadowColor: string;
  /** null until the category has been photographed */
  image: string | null;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  /** price in cents (Stripe-shaped) */
  priceCents: number;
  currency: string;
  description: string;
  artisanNote: string;
  stockCount: number;
  images: string[];
  categorySlug: string;
  isBestSeller: boolean;
  isNewArrival: boolean;
}

/** Format a cents integer into a display price, e.g. 1800 -> "$18.00" */
export function formatPrice(priceCents: number, currency = "INR"): string {
  // en-IN gives the ₹ symbol and Indian digit grouping (₹1,25,000 rather
  // than ₹125,000). priceCents holds paise for INR — same integer
  // convention as cents, just a different minor unit.
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
  }).format(priceCents / 100);
}

/**
 * "2026-02" -> "Feb 26".
 *
 * Lives here rather than in the chart because the Sales page renders the same
 * months twice — once as bars, once as a table — and they disagreed: the chart
 * said "Feb 26" while the table printed the raw "2026-02".
 *
 * Parsed by hand rather than through `new Date("2026-02")`, which is treated
 * as UTC midnight and lands in the previous month for anyone behind it.
 */
export function formatMonth(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-IN", {
    month: "short",
    year: "2-digit",
  });
}
