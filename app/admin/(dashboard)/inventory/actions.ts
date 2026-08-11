"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { PRODUCTS_TAG } from "@/lib/data/products";

export type ProductFormState = { error: string } | null;

/** "Heart Bow Pin" -> "heart-bow-pin" */
function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Reads the form into a database row.
 *
 * Prices are typed in rupees and stored in paise, because that is the unit
 * payment gateways expect and integers keep money free of rounding error. The
 * conversion lives here so nobody has to do it by hand.
 */
function parseForm(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const slug = slugify(String(formData.get("slug") ?? "") || name);
  const rupees = Number(formData.get("price_rupees"));
  const stock = Number(formData.get("stock_count"));
  const categoryId = String(formData.get("category_id") ?? "");

  return {
    row: {
      name,
      slug,
      description: String(formData.get("description") ?? "").trim() || null,
      artisan_note: String(formData.get("artisan_note") ?? "").trim() || null,
      price_cents: Math.round(rupees * 100),
      stock_count: Math.round(stock),
      category_id: categoryId || null,
      images: formData.getAll("images").map(String).filter(Boolean),
      is_active: formData.get("is_active") === "on",
      is_best_seller: formData.get("is_best_seller") === "on",
      is_new_arrival: formData.get("is_new_arrival") === "on",
    },
    validate(): string | null {
      if (!name) return "Give the piece a name.";
      if (!slug)
        return "That name produces an empty web address — add some letters or numbers.";
      if (!Number.isFinite(rupees) || rupees < 0)
        return "Enter a price of zero or more.";
      if (!Number.isFinite(stock) || stock < 0)
        return "Enter a stock count of zero or more.";
      return null;
    },
  };
}

/** Both writes touch the same pages; keeping it in one place avoids missing one. */
function revalidateStorefront(slug: string) {
  // Product reads are cached by tag — without this an edit would not appear
  // on the storefront until the revalidate window expired.
  updateTag(PRODUCTS_TAG);
  revalidatePath("/");
  revalidatePath("/shop");
  revalidatePath("/admin/inventory");
  revalidatePath(`/admin/inventory/${slug}`);
}

export async function createProduct(
  _prev: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  await requireAdmin();

  const { row, validate } = parseForm(formData);
  const invalid = validate();
  if (invalid) return { error: invalid };

  const supabase = await createClient();
  const { error } = await supabase.from("products").insert(row);

  if (error) {
    // 23505 is unique_violation — in practice always the slug.
    if (error.code === "23505") {
      return {
        error: `Another piece already uses the web address “${row.slug}”.`,
      };
    }
    return { error: error.message };
  }

  revalidateStorefront(row.slug);
  redirect("/admin/inventory");
}

export async function updateProduct(
  _prev: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Missing product id." };

  const { row, validate } = parseForm(formData);
  const invalid = validate();
  if (invalid) return { error: invalid };

  const supabase = await createClient();
  const { error } = await supabase.from("products").update(row).eq("id", id);

  if (error) {
    if (error.code === "23505") {
      return {
        error: `Another piece already uses the web address “${row.slug}”.`,
      };
    }
    return { error: error.message };
  }

  revalidateStorefront(row.slug);
  redirect("/admin/inventory");
}
