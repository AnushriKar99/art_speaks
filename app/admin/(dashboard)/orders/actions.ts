"use server";

import { revalidatePath, updateTag } from "next/cache";
import { requireAdmin } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import type { OrderStatus } from "@/lib/data/admin";
import { PRODUCTS_TAG } from "@/lib/data/products";

const ALLOWED: OrderStatus[] = [
  "pending",
  "paid",
  "shipped",
  "delivered",
  "cancelled",
];

export type StatusResult = { ok: true } | { ok: false; error: string };

/**
 * Moves an order along.
 *
 * Marking one `paid` is what deducts its stock — the trigger from 0010 fires on
 * this update, exactly once, guarded by stock_deducted_at. Cancelling a paid
 * order puts it back. Nothing here touches products directly.
 *
 * Takes arguments rather than FormData because the caller is now a client
 * component: it needs a confirmation step before cancelling, and a pending
 * state while the write and the re-render it triggers are in flight. Neither
 * is expressible with a plain form post.
 *
 * Returns a result instead of swallowing failures. The previous version logged
 * to the server console and returned, so a rejected write looked identical to
 * a successful one from the studio's side — the badge simply did not move.
 */
export async function setOrderStatus(
  id: string,
  status: OrderStatus,
): Promise<StatusResult> {
  await requireAdmin();

  // Still validated here. The client is where the buttons are, not where the
  // rules are — a crafted call could name any status at all.
  if (!id) return { ok: false, error: "Missing order id." };
  if (!ALLOWED.includes(status)) {
    return { ok: false, error: `“${status}” is not a status an order can be in.` };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("orders").update({ status }).eq("id", id);

  if (error) {
    console.error("setOrderStatus:", error.message);
    return { ok: false, error: "That did not save. Try again in a moment." };
  }

  // Confirming or reverting an order moves stock, so the cached storefront
  // reads are stale — the tag covers all of them.
  //
  // The admin pages are not listed because they are not cached: they read
  // through the session client, which cannot be, so they refetch on every
  // visit anyway. Revalidating their paths was pure cost.
  updateTag(PRODUCTS_TAG);
  revalidatePath("/admin/orders");

  return { ok: true };
}

/**
 * Marks a single line item prepared or not — studio bookkeeping (0018), not
 * part of the order's own status. A multi-item order can have some pieces
 * ready and others still in progress, which is exactly why this lives on the
 * line rather than the order.
 *
 * No cache to touch: this never changes what a customer or the storefront can
 * see, only what the studio's own view of an order shows.
 */
export async function setItemPrepared(
  itemId: string,
  prepared: boolean,
): Promise<StatusResult> {
  await requireAdmin();

  if (!itemId) return { ok: false, error: "Missing item id." };

  const supabase = await createClient();

  // The client already hides this control outside 'paid' — restated here
  // because the client is where the button is, not where the rule is. A
  // crafted call could still name any item id.
  //
  // Two queries, deliberately, not `.eq("orders.status", "paid")` chained onto
  // the update. That reads as though it filters the row set the same way it
  // does on a SELECT — it is the exact pattern lib/data/products.ts uses for
  // "only if the joined row matches" — but PostgREST does not enforce a
  // join-column filter on a mutation. Tested directly against a real pending
  // order: the filtered call still updated it, and only the SELECT-shaped
  // embed in the response came back null. It fails silently, which is worse
  // than not having the check at all, since the code reads as protected.
  const { data: item, error: lookupError } = await supabase
    .from("order_items")
    .select("orders(status)")
    .eq("id", itemId)
    .single();

  if (lookupError || !item) {
    return { ok: false, error: "That item could not be found." };
  }

  const orderStatus = (item as unknown as { orders: { status: string } | null })
    .orders?.status;
  if (orderStatus !== "paid") {
    return {
      ok: false,
      error: "This can only be marked prepared once the order is paid.",
    };
  }

  const { error } = await supabase
    .from("order_items")
    .update({ prepared })
    .eq("id", itemId);

  if (error) {
    console.error("setItemPrepared:", error.message);
    return { ok: false, error: "That did not save. Try again in a moment." };
  }

  revalidatePath("/admin/orders");
  return { ok: true };
}
