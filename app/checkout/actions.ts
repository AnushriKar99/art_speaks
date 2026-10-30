"use server";

import { revalidatePath, updateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { PRODUCTS_TAG } from "@/lib/data/products";

export interface PlaceOrderPayload {
  items: { product_id: string; quantity: number }[];
  customer_name: string;
  phone: string;
  email: string | null;
  address: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    pincode: string;
  };
}

export type PlacedOrderResponseLine = {
  name: string;
  quantity: number;
  unit_price_cents: number;
};

export type PlacedOrderResponseRow = {
  order_number: number;
  subtotal_cents: number;
  shipping_cents: number;
  total_cents: number;
  lines: PlacedOrderResponseLine[] | null;
  expires_at?: string | null;
};

export async function placeWhatsAppOrderAction(payload: PlaceOrderPayload) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("place_whatsapp_order", payload);

  if (error) {
    console.error("placeWhatsAppOrderAction error:", error.message);
    return { ok: false as const, error: error.message };
  }

  // Stock was decremented and reserved under the 30-minute lock.
  // Invalidate the cache tags so all product cards, overlays, and stock badges update immediately.
  updateTag(PRODUCTS_TAG);
  revalidatePath("/", "layout");
  revalidatePath("/shop");
  revalidatePath("/cart");
  revalidatePath("/admin/inventory");
  revalidatePath("/admin/orders");

  return { ok: true as const, data: data as PlacedOrderResponseRow[] };
}
