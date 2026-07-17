export interface Category {
  id: string;
  name: string;
  slug: string;
  /** hex border/accent colour used on the homepage category circles */
  accentColor: string;
  /** rgba/hex used for the offset shadow on the category circle */
  shadowColor: string;
  image: string;
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
export function formatPrice(priceCents: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(priceCents / 100);
}
