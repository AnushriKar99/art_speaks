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

/* ------------------------------------------------------------------ orders */

export type OrderStatus =
  | "pending"
  | "paid"
  | "shipped"
  | "delivered"
  | "cancelled";

export interface AdminOrderLine {
  id: string;
  productId: string | null;
  productName: string;
  unitPriceCents: number;
  quantity: number;
  /** Current stock of that product, so overselling is visible before confirming. */
  stockCount: number | null;
}

export interface AdminOrder {
  id: string;
  orderNumber: number;
  channel: "online" | "offline" | "whatsapp";
  status: OrderStatus;
  customerName: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  address: Record<string, string> | null;
  totalCents: number;
  currency: string;
  stockDeductedAt: string | null;
  createdAt: string;
  lines: AdminOrderLine[];
}

type OrderRow = {
  id: string;
  order_number: number;
  channel: AdminOrder["channel"];
  status: OrderStatus;
  contact_phone: string | null;
  contact_email: string | null;
  shipping_address: Record<string, string> | null;
  total_cents: number;
  currency: string;
  stock_deducted_at: string | null;
  created_at: string;
  order_items: {
    id: string;
    product_id: string | null;
    product_name: string;
    unit_price_cents: number;
    quantity: number;
    products: { stock_count: number } | null;
  }[];
};

/**
 * Every order, newest first, with its line items and each product's current
 * stock. Uses the admin's session, so the RLS policies from 0003 authorise it.
 */
export async function getAdminOrders(): Promise<AdminOrder[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("orders")
    .select(
      "id, order_number, channel, status, contact_phone, contact_email, shipping_address, total_cents, currency, stock_deducted_at, created_at, order_items(id, product_id, product_name, unit_price_cents, quantity, products(stock_count))",
    )
    .order("created_at", { ascending: false });

  if (error) {
    console.error("getAdminOrders:", error.message);
    return [];
  }

  return (data as unknown as OrderRow[]).map((o) => ({
    id: o.id,
    orderNumber: o.order_number,
    channel: o.channel,
    status: o.status,
    // The name is stored inside the address blob — see place_whatsapp_order.
    customerName: o.shipping_address?.name ?? null,
    contactPhone: o.contact_phone,
    contactEmail: o.contact_email,
    address: o.shipping_address,
    totalCents: o.total_cents,
    currency: o.currency,
    stockDeductedAt: o.stock_deducted_at,
    createdAt: o.created_at,
    lines: (o.order_items ?? []).map((l) => ({
      id: l.id,
      productId: l.product_id,
      productName: l.product_name,
      unitPriceCents: l.unit_price_cents,
      quantity: l.quantity,
      stockCount: l.products?.stock_count ?? null,
    })),
  }));
}
