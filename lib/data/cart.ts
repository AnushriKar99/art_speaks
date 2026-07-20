import { getAllProducts } from "@/lib/data/products";
import type { Product } from "@/lib/types";

/** A product in the basket with its chosen quantity (mirrors the planned Supabase cart rows). */
export interface CartItem {
  product: Product;
  quantity: number;
}

/**
 * The cart is user-specific and needs persistence that does not exist yet (no
 * Auth/Supabase/Stripe). Returns a small mock basket (the two items from the
 * Stitch cart screen) so the cart page renders against real product data; swap
 * the body when the backend lands.
 */
export async function getCartItems(): Promise<CartItem[]> {
  const products = await getAllProducts();
  const slugs = ["lavender-whisper-charm", "worry-stone-set"];
  return products
    .filter((p) => slugs.includes(p.slug))
    .map((product) => ({ product, quantity: 1 }));
}
