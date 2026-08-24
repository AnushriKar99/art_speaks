import { cache } from "react";
import { unstable_cache } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";
import type { Category, Product } from "@/lib/types";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { unwrap } from "./query-error";

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
    // Left null on purpose — the card shows a 'coming soon' tile rather
    // than borrowing another category's photo.
    image: row.image_url,
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

/**
 * Product reads are cached and dropped whenever the admin saves — see
 * updateTag(PRODUCTS_TAG) in the admin Server Actions.
 *
 * They were left uncached originally because stale product data is worse than
 * a slow page. Tag invalidation removes that trade-off: an edit clears the
 * cache immediately, so the only staleness window is a change made directly in
 * the database, which the short revalidate window covers.
 */
export const PRODUCTS_TAG = "products";

const loadCategories = unstable_cache(
  async (): Promise<Category[]> => {
    const supabase = createPublicClient();
    const { data, error } = await supabase
      .from("categories")
      .select("id, slug, name, accent_color, image_url")
      .order("sort_order");

    unwrap("getCategories", { data, error });
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

export const getAllProducts = unstable_cache(
  async (): Promise<Product[]> => {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_COLUMNS)
    .order("created_at", { ascending: false });

  unwrap("getAllProducts", { data, error });
  return (data as unknown as ProductRow[]).map(toProduct);
  },
  ["all-products"],
  { revalidate: 300, tags: [PRODUCTS_TAG] },
);

const loadProductsByCategory = unstable_cache(
  async (slug: string): Promise<Product[]> => {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_COLUMNS)
    // Filtering on a joined column, so the inner-join hint is required —
    // without `!inner` this would return every product.
    .eq("categories.slug", slug)
    .not("categories", "is", null)
    .order("created_at", { ascending: false });

  unwrap("getProductsByCategory", { data, error });
  return (data as unknown as ProductRow[])
    .map(toProduct)
    .filter((p) => p.categorySlug === slug);
  },
  ["products-by-category"],
  { revalidate: 300, tags: [PRODUCTS_TAG] },
);

export async function getProductsByCategory(slug?: string): Promise<Product[]> {
  return slug ? loadProductsByCategory(slug) : getAllProducts();
}

/**
 * One product by its web address.
 *
 * Returns null for a slug that does not exist, so the page can call notFound()
 * rather than rendering an empty shell — a product that never existed and a
 * product that is delisted should both be a 404, not a 200 with nothing on it.
 */
const loadProductBySlug = unstable_cache(
  async (slug: string): Promise<Product | null> => {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_COLUMNS)
    .eq("slug", slug)
    .maybeSingle();

  unwrap("getProductBySlug", { data, error });
  return data ? toProduct(data as unknown as ProductRow) : null;
  },
  ["product-by-slug"],
  { revalidate: 300, tags: [PRODUCTS_TAG] },
);

/**
 * cache() on top of the tag cache: generateMetadata and the page body both ask
 * for the same slug in one request, and this makes the second ask free.
 */
export const getProductBySlug = cache(
  (slug: string): Promise<Product | null> => loadProductBySlug(slug),
);

/** Other pieces from the same category, for the bottom of a product page. */
export async function getRelatedProducts(
  categorySlug: string,
  excludeSlug: string,
  limit = 4,
): Promise<Product[]> {
  if (!categorySlug) return [];
  const all = await getProductsByCategory(categorySlug);
  return all.filter((p) => p.slug !== excludeSlug).slice(0, limit);
}

export const getBestSellers = unstable_cache(
  async (): Promise<Product[]> => {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_COLUMNS)
    .eq("is_best_seller", true)
    .order("created_at", { ascending: false });

  unwrap("getBestSellers", { data, error });
  return (data as unknown as ProductRow[]).map(toProduct);
  },
  ["best-sellers"],
  { revalidate: 300, tags: [PRODUCTS_TAG] },
);

export const getNewArrivals = unstable_cache(
  async (): Promise<Product[]> => {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_COLUMNS)
    .eq("is_new_arrival", true)
    .order("created_at", { ascending: false });

  unwrap("getNewArrivals", { data, error });
  return (data as unknown as ProductRow[]).map(toProduct);
  },
  ["new-arrivals"],
  { revalidate: 300, tags: [PRODUCTS_TAG] },
);

/**
 * PostgREST builds its `or=(...)` filter from a comma-separated string, so a
 * search term containing a comma, parenthesis or quote would break out of the
 * value and corrupt the filter. `%` and `_` are LIKE wildcards and would make
 * the search match far more than the visitor typed.
 *
 * Stripping them is safe here: none carry meaning in a product search.
 */
function sanitiseSearchTerm(raw: string): string {
  return raw.trim().replace(/[,()"'%_\\*]/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * Free-text search across everything a visitor might reasonably type: the
 * product name, its description, the artisan note, its slug, and its category
 * name. Matching is case-insensitive and substring-based, so "bow" finds
 * "Heart Bow Pin" and "gogh" would find a painting whose note mentions it.
 *
 * Category names are matched against the cached list rather than a join, which
 * keeps this to a single round trip.
 */
export async function searchProducts(rawQuery: string): Promise<Product[]> {
  const q = sanitiseSearchTerm(rawQuery);
  if (!q) return [];

  const categories = await loadCategories();
  const matchingCategoryIds = categories
    .filter((c) => c.name.toLowerCase().includes(q.toLowerCase()))
    .map((c) => c.id);

  const filters = [
    `name.ilike.%${q}%`,
    `description.ilike.%${q}%`,
    `artisan_note.ilike.%${q}%`,
    `slug.ilike.%${q}%`,
  ];
  if (matchingCategoryIds.length > 0) {
    filters.push(`category_id.in.(${matchingCategoryIds.join(",")})`);
  }

  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_COLUMNS)
    .or(filters.join(","))
    .order("name");

  unwrap("searchProducts", { data, error });

  const exact = (data as unknown as ProductRow[]).map(toProduct);
  if (exact.length > 0) return exact;

  // Nothing matched literally — try again allowing for typos. Ordered this way
  // round because substring matching is better for the common case: typing
  // "bow" should return every bow, not the three that score highest.
  return searchProductsFuzzy(q);
}

/** Row shape returned by the search_products_fuzzy RPC (migration 0008). */
type FuzzyRow = {
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
  category_slug: string | null;
  score: number;
};

/**
 * Typo-tolerant fallback, backed by pg_trgm (migration 0008). Scores how much
 * three-character overlap a term shares with each product, so "strawbery"
 * still finds "Strawberry Pin".
 *
 * Returns empty rather than throwing if the migration hasn't been applied —
 * search degrades to substring-only instead of the page erroring.
 */
async function searchProductsFuzzy(term: string): Promise<Product[]> {
  const supabase = createPublicClient();
  const { data, error } = await supabase.rpc("search_products_fuzzy", {
    search_term: term,
    // The function defaults to 0.15, which lets noise through: "strawbery"
    // returned Starry Night at 0.15 alongside Strawberry Pin at 0.56. Genuine
    // near-misses measured 0.36 and above, so 0.25 sits clear of both.
    // Tuned here rather than in the migration so the function stays general
    // and the threshold can move without a schema change.
    min_score: 0.25,
  });

  unwrap("searchProductsFuzzy", { data, error });

  return (data as FuzzyRow[]).map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    priceCents: row.price_cents,
    currency: row.currency,
    description: row.description ?? "",
    artisanNote: row.artisan_note ?? "",
    stockCount: row.stock_count,
    images: usableImages(row.images),
    categorySlug: row.category_slug ?? "",
    isBestSeller: row.is_best_seller,
    isNewArrival: row.is_new_arrival,
  }));
}

/**
 * The signed-in visitor's saved pieces.
 *
 * Uses the session client rather than the public one — RLS on `wishlist`
 * filters to the caller's own rows, so a signed-out visitor gets nothing back
 * without this needing to check.
 */
export async function getWishlist(): Promise<Product[]> {
  const supabase = await createServerClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) return [];

  const { data, error } = await supabase
    .from("wishlist")
    .select(`products(${PRODUCT_COLUMNS})`)
    .eq("customer_id", userId)
    .order("created_at", { ascending: false });

  unwrap("getWishlist", { data, error });

  return (data as unknown as { products: ProductRow | null }[])
    .map((r) => r.products)
    .filter((p): p is ProductRow => p !== null)
    .map(toProduct);
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

export async function getCollection(
  slug?: string,
  query?: string,
): Promise<CollectionView | null> {
  // A search term wins over any collection filter — someone who has typed into
  // the search box is looking across the whole shop, not within a category.
  const q = query?.trim();
  if (q) {
    const products = await searchProducts(q);
    return {
      title: `“${q}”`,
      eyebrow:
        products.length === 0
          ? "No matches"
          : `${products.length} ${products.length === 1 ? "match" : "matches"}`,
      products,
    };
  }

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

  // Unknown slug → signal it, rather than quietly serving the full catalogue.
  //
  // Falling back was graceful for a human who mistyped, but to a crawler
  // /shop?collection=anything-at-all was a 200 identical to /shop — an
  // unbounded space of duplicate URLs, which is the soft-404 pattern search
  // engines penalise. The page turns this into a real 404.
  return null;
}

/**
 * Reorders a collection for display.
 *
 * Deliberately in memory rather than in the query. These lists are small, and
 * the reads behind them are cached by tag — adding a sort to the query would
 * multiply the cache into one entry per ordering, for no gain at this size.
 *
 * An unrecognised key leaves the order alone, which is the same thing "no sort
 * chosen" does, so a mangled URL degrades to the default rather than to empty.
 *
 * The default is newest-first (created_at DESC), which is what the control
 * labels it. Search results are the one exception — those come back ranked by
 * relevance. Neither is a best-seller ranking; that is its own collection.
 */
export function sortProducts(products: Product[], sort?: string): Product[] {
  if (sort === "price-asc") {
    return [...products].sort((a, b) => a.priceCents - b.priceCents);
  }
  if (sort === "price-desc") {
    return [...products].sort((a, b) => b.priceCents - a.priceCents);
  }
  return products;
}
