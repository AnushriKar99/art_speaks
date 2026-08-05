import { unstable_cache } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";
import type { Category, Product } from "@/lib/types";

/**
 * Product and category reads, backed by Supabase.
 *
 * Read through the sessionless client (see lib/supabase/public.ts), so the
 * storefront always shows what a visitor sees — an admin browsing the shop
 * would otherwise see inactive products, since RLS grants them `for all` on
 * products and that includes SELECT.
 *
 * No auth is needed: the RLS from migration 0001 makes categories public and
 * products public when `is_active`, so an inactive product is invisible here
 * without any filtering in application code.
 *
 * The database speaks snake_case and stores a category_id; the UI speaks
 * camelCase and a categorySlug. The row → domain mapping below is the only
 * place that gap is bridged.
 */

/** Shown until a category has real photography. */
const CATEGORY_PLACEHOLDER_IMAGE =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuDKooxAAp8WiC8rTU_TiFkw3Q3nrLdCBRVPYjh2EFCsf35WHNP7KhPFXR-mEwI1OurnjeuWQradKrXNmYC6x3cKvFeNAI9oCGSE_o9uXWqwePWm5QU2N9W4jsGgY9Warmnyx41UYvwbR4yCwqv7koBM4Nhb6_i1fSdvcLW9oDW-tle0BjVsjD_RVPfKF8d_pOVBA784qPGSDAJTjhgplxnljpy_cILywjwUAhiv4uo8hRB1emoO10-0LQ";

/** Fallback accent so a category with no colour set still renders sensibly. */
const DEFAULT_ACCENT = "#FFB7CE";

type CategoryRow = {
  id: string;
  slug: string;
  name: string;
  accent_color: string | null;
  image_url: string | null;
};

/** The join gives back either an object or null, depending on the row. */
type ProductRow = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  artisan_note: string | null;
  price_cents: number;
  currency: string;
  stock_count: number;
  images: string[] | null;
  is_best_seller: boolean;
  is_new_arrival: boolean;
  categories: { slug: string } | null;
};

const PRODUCT_COLUMNS =
  "id, slug, name, description, artisan_note, price_cents, currency, stock_count, images, is_best_seller, is_new_arrival, categories(slug)";

function toCategory(row: CategoryRow): Category {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    accentColor: row.accent_color ?? DEFAULT_ACCENT,
    // The schema has no separate shadow colour; the design uses the accent for
    // both the border and the offset shadow.
    shadowColor: row.accent_color ?? DEFAULT_ACCENT,
    image: row.image_url ?? CATEGORY_PLACEHOLDER_IMAGE,
  };
}

/**
 * Drops anything that isn't a usable absolute URL.
 *
 * `next/image` throws on a malformed src, and because products render inside
 * the page itself that throw becomes a 500 for the whole shop — one mistyped
 * row taking down every product. Filtering here means a bad URL costs that one
 * card its photo (it falls back to the 🥺 placeholder) and nothing else.
 */
function usableImages(images: string[] | null): string[] {
  return (images ?? []).filter((src) => {
    try {
      const { protocol } = new URL(src);
      return protocol === "https:" || protocol === "http:";
    } catch {
      console.warn(`ignoring unusable product image URL: ${src}`);
      return false;
    }
  });
}

function toProduct(row: ProductRow): Product {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    priceCents: row.price_cents,
    currency: row.currency,
    description: row.description ?? "",
    artisanNote: row.artisan_note ?? "",
    stockCount: row.stock_count,
    images: usableImages(row.images),
    categorySlug: row.categories?.slug ?? "",
    isBestSeller: row.is_best_seller,
    isNewArrival: row.is_new_arrival,
  };
}

/**
 * Categories are read by the header on every single page, and they change
 * roughly never — so paying a round trip for them per request was the largest
 * fixed cost on the site.
 *
 * Cached for an hour and tagged, so the admin panel can drop the cache the
 * moment a category is edited:  revalidateTag(CATEGORIES_TAG)
 */
export const CATEGORIES_TAG = "categories";

const loadCategories = unstable_cache(
  async (): Promise<Category[]> => {
    const supabase = createPublicClient();
    const { data, error } = await supabase
      .from("categories")
      .select("id, slug, name, accent_color, image_url")
      .order("sort_order");

    if (error) {
      console.error("getCategories:", error.message);
      return [];
    }
    return (data as CategoryRow[]).map(toCategory);
  },
  ["categories"],
  { revalidate: 3600, tags: [CATEGORIES_TAG] },
);

export async function getCategories(): Promise<Category[]> {
  return loadCategories();
}

/**
 * Resolved from the cached list rather than its own query — with eight
 * categories, filtering an array we already have beats a second round trip.
 */
export async function getCategoryBySlug(
  slug: string,
): Promise<Category | undefined> {
  const categories = await loadCategories();
  return categories.find((c) => c.slug === slug);
}

export async function getAllProducts(): Promise<Product[]> {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_COLUMNS)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("getAllProducts:", error.message);
    return [];
  }
  return (data as unknown as ProductRow[]).map(toProduct);
}

export async function getProductsByCategory(slug?: string): Promise<Product[]> {
  if (!slug) return getAllProducts();

  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_COLUMNS)
    // Filtering on a joined column, so the inner-join hint is required —
    // without `!inner` this would return every product.
    .eq("categories.slug", slug)
    .not("categories", "is", null)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("getProductsByCategory:", error.message);
    return [];
  }
  return (data as unknown as ProductRow[])
    .map(toProduct)
    .filter((p) => p.categorySlug === slug);
}

export async function getBestSellers(): Promise<Product[]> {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_COLUMNS)
    .eq("is_best_seller", true)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("getBestSellers:", error.message);
    return [];
  }
  return (data as unknown as ProductRow[]).map(toProduct);
}

export async function getNewArrivals(): Promise<Product[]> {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_COLUMNS)
    .eq("is_new_arrival", true)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("getNewArrivals:", error.message);
    return [];
  }
  return (data as unknown as ProductRow[]).map(toProduct);
}

/**
 * Wishlist needs persisted favourites, which the heart buttons don't write yet.
 * The `wishlist` table and its RLS exist; only the UI wiring is missing.
 */
export async function getWishlist(): Promise<Product[]> {
  return [];
}

/**
 * A resolved view for the shared items page (`/shop`). The page is driven by a
 * single `?collection=<slug>` URL param; this resolver maps that slug to the
 * products to show plus the display copy (which doubles as the page title).
 *
 * Recognised slugs:
 *   - undefined         → the full collection ("All Items")
 *   - a category slug   → that category
 *   - "best-sellers"    → best sellers
 *   - "new-arrivals"    → new arrivals
 *   - "wishlist"        → the user's saved pieces (empty until backend lands)
 *   - anything else     → falls back to the full collection
 */
export interface CollectionView {
  /** doubles as the browser/page title */
  title: string;
  eyebrow: string;
  products: Product[];
  /** set only when the collection is a category, so its filter chip highlights */
  categorySlug?: string;
}

const SPECIAL_COLLECTIONS: Record<
  string,
  { eyebrow: string; load: () => Promise<Product[]> }
> = {
  "best-sellers": { eyebrow: "Curated Favorites", load: getBestSellers },
  "new-arrivals": { eyebrow: "Fresh Out of the Oven", load: getNewArrivals },
  wishlist: { eyebrow: "Your Saved Pieces", load: getWishlist },
};

const COLLECTION_TITLES: Record<string, string> = {
  "best-sellers": "Best Sellers",
  "new-arrivals": "New Arrivals",
  wishlist: "Wishlist",
};

export async function getCollection(slug?: string): Promise<CollectionView> {
  if (!slug) {
    return {
      title: "All Items",
      eyebrow: "The Full Collection",
      products: await getAllProducts(),
    };
  }

  const special = SPECIAL_COLLECTIONS[slug];
  if (special) {
    return {
      title: COLLECTION_TITLES[slug],
      eyebrow: special.eyebrow,
      products: await special.load(),
    };
  }

  // Fetched together, not in sequence. The products query doesn't depend on
  // the category lookup — only the title does — so awaiting one before starting
  // the other doubled the latency of every category page for no reason.
  const [category, products] = await Promise.all([
    getCategoryBySlug(slug),
    getProductsByCategory(slug),
  ]);

  if (category) {
    return {
      title: category.name,
      eyebrow: "Category",
      products,
      categorySlug: slug,
    };
  }

  // Unknown slug → fall back to the full collection.
  return {
    title: "All Items",
    eyebrow: "The Full Collection",
    products: await getAllProducts(),
  };
}
