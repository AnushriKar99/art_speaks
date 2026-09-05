"use server";

import { revalidatePath, updateTag } from "next/cache";
import { requireAdmin } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { PRODUCTS_TAG } from "@/lib/data/products";

export type SaleLine = {
  productId: string;
  quantity: number;
  /** Rupees as typed on the form; converted to paise here. */
  priceRupees: number;
};

export type SaleResult = { ok: true; orderId: string } | { ok: false; error: string };

/**
 * Records an in-person sale.
 *
 * Delegates to the record_offline_sale function (migration 0009, extended by
 * 0021) rather than inserting from here, so the order and its line items share
 * one transaction. Two separate inserts could leave a sale with no items, or
 * items whose stock was already deducted against an order that never landed.
 *
 * `extraRupees` is money taken for things not in the catalogue. It is recorded
 * as an amount on the order, never as a line item — see 0021 for why.
 */
export async function recordOfflineSale(
  lines: SaleLine[],
  soldOn: string,
  extraRupees = 0,
): Promise<SaleResult> {
  await requireAdmin();

  const items = lines
    .filter((l) => l.quantity > 0)
    .map((l) => ({
      product_id: l.productId,
      quantity: Math.round(l.quantity),
      unit_price_cents: Math.round(l.priceRupees * 100),
    }));

  // Not Number.isFinite alone: NaN from an unparseable box would otherwise
  // reach Math.round and be sent as null.
  const extraCents =
    Number.isFinite(extraRupees) && extraRupees > 0
      ? Math.round(extraRupees * 100)
      : 0;

  if (items.length === 0 && extraCents === 0) {
    return {
      ok: false,
      error: "Tap at least one piece, or enter an extra amount.",
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("record_offline_sale", {
    items,
    sold_on: soldOn,
    extra_cents: extraCents,
  });

  if (error) {
    console.error("recordOfflineSale:", error.message);
    return { ok: false, error: error.message };
  }

  // Stock changed, so anything showing a count is now stale.
  updateTag(PRODUCTS_TAG);
  revalidatePath("/admin/sales/new");
  revalidatePath("/admin/inventory");
  revalidatePath("/admin/sales");
  revalidatePath("/shop");
  revalidatePath("/");

  return { ok: true, orderId: data as string };
}
