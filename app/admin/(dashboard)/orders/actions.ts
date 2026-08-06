"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import type { OrderStatus } from "@/lib/data/admin";

const ALLOWED: OrderStatus[] = [
  "pending",
  "paid",
  "shipped",
  "delivered",
  "cancelled",
];

/**
 * Moves an order along.
 *
 * Marking one `paid` is what deducts its stock — the trigger from 0010 fires on
 * this update, exactly once, guarded by stock_deducted_at. Nothing here touches
 * products directly.
 */
export async function setOrderStatus(formData: FormData): Promise<void> {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "") as OrderStatus;

  if (!id || !ALLOWED.includes(status)) return;

  const supabase = await createClient();
  const { error } = await supabase
    .from("orders")
    .update({ status })
    .eq("id", id);

  if (error) {
    console.error("setOrderStatus:", error.message);
    return;
  }

  revalidatePath("/admin/orders");
  // Stock may have moved, so anything showing a count is now stale.
  revalidatePath("/admin/inventory");
  revalidatePath("/admin/sales/new");
  revalidatePath("/shop");
  revalidatePath("/");
}
