import { createClient } from "@/lib/supabase/server";
import type { Product } from "@/lib/types";

/**
 * Admin-side reads and writes for the studio pages.
 *
 * Deliberately separate from lib/data/products.ts. That module reads through a
 * sessionless client so the storefront always shows what a visitor sees; this
 * one uses the admin's own session, so it sees inactive products too and RLS
 * still decides whether a write is allowed. Mixing the two would mean the
 * storefront leaking unpublished work or the admin being unable to edit it.
 */

/** A product as the studio sees it — includes fields the storefront never needs. */
export interface AdminProduct extends Product {
  isActive: boolean;
  categoryId: string | null;
  updatedAt: string;
}

type AdminProductRow = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  artisan_note: string | null;
  price_cents: number;
  currency: string;
  stock_count: number;
  images: string[] | null;
  is_active: boolean;
  is_best_seller: boolean;
  is_new_arrival: boolean;
  category_id: string | null;
  updated_at: string;
  categories: { slug: string } | null;
};

const ADMIN_PRODUCT_COLUMNS =
  "id, slug, name, description, artisan_note, price_cents, currency, stock_count, images, is_active, is_best_seller, is_new_arrival, category_id, updated_at, categories(slug)";

function toAdminProduct(row: AdminProductRow): AdminProduct {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    priceCents: row.price_cents,
    currency: row.currency,
    description: row.description ?? "",
    artisanNote: row.artisan_note ?? "",
    stockCount: row.stock_count,
    images: row.images ?? [],
    categorySlug: row.categories?.slug ?? "",
    isBestSeller: row.is_best_seller,
    isNewArrival: row.is_new_arrival,
    isActive: row.is_active,
    categoryId: row.category_id,
    updatedAt: row.updated_at,
  };
}

/** Every product, published or not, newest first. */
export async function getAdminProducts(): Promise<AdminProduct[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select(ADMIN_PRODUCT_COLUMNS)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("getAdminProducts:", error.message);
    return [];
  }
  return (data as unknown as AdminProductRow[]).map(toAdminProduct);
}

export async function getAdminProductBySlug(
  slug: string,
): Promise<AdminProduct | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select(ADMIN_PRODUCT_COLUMNS)
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    console.error("getAdminProductBySlug:", error.message);
    return null;
  }
  return data ? toAdminProduct(data as unknown as AdminProductRow) : null;
}
