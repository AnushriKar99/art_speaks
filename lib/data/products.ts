import type { Category, Product } from "@/lib/types";

/**
 * Local mock data sourced from the Stitch design exports.
 *
 * These are intentionally exposed through async functions that mirror what the
 * Supabase-backed data layer will look like, so the page/components never need
 * to change when the real backend lands — only the bodies of these functions do.
 */

// Google usercontent image URLs from the design export. Swapped for Supabase
// Storage paths later.
const IMG = {
  lavenderCharm:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuCM3QvU4035pWOGZSDoiSBLXBmQ_EFOplSkv4Nn69hiJoUnuT7dB4exfKdYRn-Y7WZkr9bsA1c8rNh_k_WdBFlYAtFkHP3hXqFMOpMYdbfaAYeYA5Q05jKSbXxTDnKMhOG1REgIsr7sINT7BHUj_O8_6S1XsaY7urDgCuRzPLO8kT5Xnd3WJybuHe9_laxWY93KLGuIGaVCzvcXJx-JSzFk_gYFKbB5mmqlFN1GzBoScM1-WgQzLbfxxA",
  midnightBookmark:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuDN64zI3Qf-bqROPeOsGRLmRBqXYwoMRT1pM2DcogroPULNWs9T4u3xd7sRDKLXVG4eS_c7IcpoTIbVCWgnGZ9YG5CpytPz-F31JWTRlucnBJjPcY9QoqCs-x0uPxm3WQa536e1Kw8rCzirMzcoCU_G5lqx2jet7RDHNmzzxm6lyS0J-HXl5riATlVvACMB8BUrR3PgpYQJuT5WkvJ2Rd0X1FMmeQgpKkUjpJYXhCXEwpEFxw4M0tj9zg",
  oceanWorryStone:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuCh4uQW5dvat_-BaRqYGdF2VU5TdmvPJHtQkPSgiGmP5q2MBW7-n1ggMJPxowLPcw8bp9LfxgEXhY0jJyorUZ9REdqrzPxJ3sIJhwQBGyHsSkoHXVMmQRK9y0gCIVn8MpGbNLTogKXJmSkv8tMVqU9DEs9NPcajvT4LyCG0XsEx1GpeBXVl03V3hei2L9SNfVsTHdzpvDnyDLUMDXH1_HaFaeTrS5CyhzMeXFTRqFxZYzC7idL0CYGHyQ",
  minimalistTote:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuAWYoRN1hcxxRIOZX20NT7clPdw46wRUrgIanuL7ZNdoDS4aUO4Dlxo_50ZAuvc0Nkd66h06sqwBE1jcJKoecwoXX9xWZvmsK513OyZKpl5jdJOgAVQA5gZu0Bkk2XckhQRad6ESJ_jvtTxr7-IyGhX7EgGwLKDEeYBagunhSLG4s7gmsyLa9owpIAP-OiyWKIQB1IRyvut2DU_0cCqosGTsO4R6fssVRbibdxSOddEacese8oN2Zu0Mg",
  monsteraDish:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuCMovsTmQ5y5KA1XQXzQHBGy0l1nYdKwDpZRnkmTs7842JxrevvM-pG3m82RJ_rmEpPECRWKT86y6_hw_cmlfBmyBJmYgaqagCoSxdf_rPCFqsyx-Zs1QcYcQm9tEANyQhQmXjuEbkqBI2VXcd6m-QpdJ44pJqZ7x6u385V9jEx5a3JMbv6Ft1JG3A_pAhTjB-nzMNNix2jeasulQmmM57RuTL4khlTqspX_Qpjp76vDh5CsHhpRjh1fQ",
  botanicalStickers:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuDT5L5upOksw2h3BOIMjilhTq8mspP3NoTC1VsH7I-h-RFaaZmYkQcz01X-DPeR8QYiDdaIxZDVRShcd5Pd4S4i0qtQE-LqwBVJW_qtBIWSS-0ovLsuHNs7xFsBOBdPNxmhD98GQIlOsu3qE6MoKQzyw7nl72pwQt2O_T8SIvQfKXpUaiZE0a0TNv4CHUSsbmDCQQfauUkMe8QBKcsVcqbsFBMQl2SC1Phx-2zNK_e57Z8FSM3hs7t3yg",
  worryStoneSet:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuCtrEDlidBC7Hx4xjLlX54AOEcPWVUvaclvQQ40w1DYnNdgdFBqUDToXsMpbVjJa2kxz6dEl2L1i8aQk4gfo1_GR1HJza2TQyT5iOh4kU1_Rs9_EDCMXCZCRerivH_Hgdf56nktLaUXWRQ7jP95KfiY3E-NH1hMQ2sMHPdNCpc0IteG_uIvcr0hz6AHT8jMR45-78a00NwHCoiPs0Ee4LdVCvXQ5bBv5av5x45gZ95ghRCCjiMA1mNpoQ",
  dreamyStickers:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuAq1RSQwZRKbQKzeQBaiGwvQQpVRYEbPFxsa5HL8nn71M2yb394OGRLHSnpDLJXY6IWDm8NY1ra79cD--1Yc0eM2VXOQTRac13ADnKvicuFVx7b91wbz8Fd_GYmiMa2pubXjcaB8boD_0P5K7SYKz--pzstDwLoJmQOUAZmEiqv9CkhrxwG1Ni_YKflzPYUWtlIco-eKunLguljpWEcLnsxzBdQDyg5LbiP_xoqsjdIp04Ob5csCfVuNQ",
  ceramicPalette:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuBkipR38ayssJ8hepc2EC7n58VyUmdhmuXqG7ZBlM6oyrL7trohten8pIYjXBEvdAqsmg0denrzLAmS_ZYfGoajdML7F9B0A9IhWctGCqY9bX11Mc7NKhngw1-nvYoPxiYHPdGekDcqXa_8hMu2gMXbLZiWluMRlTuiEtCo2VllhCKZ-df0lCoExKvYRGjGFCqujQYSDVYF-A23CJ2n1BHJAT0U8FzJkINYuNZ6tTFjdqxwO8BsTtlPAw",
  handBoundJournal:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuCE3eLndsU7Mmv_N_WVoUi-4EOO_HAVOq0FkmTXYcwb4JXzyAMYwuYPCPBZgUxiPVBd6L0HKw5W2xaW0lNQz3clT1nhRGDFTyL9epQ1FvJvcuywi-qMFFdNeFQZCHsL6tbFAm87FFK0tJAss6oV9L_Xo0CfCFzjAjLMYiNi1xENC9XmdaffBuhRPKjVy7Li1QYOXQ-sOkDKivhcJVOvd-RS7mXiP6MBRHbw4Dt9xFyCLFQfcpWqinHfkQ",
  categoryCharms:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuDKooxAAp8WiC8rTU_TiFkw3Q3nrLdCBRVPYjh2EFCsf35WHNP7KhPFXR-mEwI1OurnjeuWQradKrXNmYC6x3cKvFeNAI9oCGSE_o9uXWqwePWm5QU2N9W4jsGgY9Warmnyx41UYvwbR4yCwqv7koBM4Nhb6_i1fSdvcLW9oDW-tle0BjVsjD_RVPfKF8d_pOVBA784qPGSDAJTjhgplxnljpy_cILywjwUAhiv4uo8hRB1emoO10-0LQ",
  categoryWorryStones:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuCZMpyr4Av8xYjsicArJ9MHyCDMqfTaLQ7VvMS5FRH8GiJ4viPdlf_17xwAuDunZJPqvl220jWpl9I4LDNfYAQRFLx0eZPOQUOgjGQ6Gl6Dq7ZHOgwjXmkI9QLfKN0Lu_2LF8yE4Mexol_nQY8mzT6s1wPFVCCUL3sIGX-xhZfh7_HIQ7lr84iK6tA-vjMAweXVpBIRinjBl668iUzwqchEHD2bojYfxYSVLy-VPFXNQU4LvXK_2Djajw",
} as const;

// Placeholder for category cards until real photography is added per category.
const CATEGORY_PLACEHOLDER_IMAGE = IMG.categoryCharms;

// One distinct pastel accent per card, from the same kawaii palette family.
const CATEGORIES: Category[] = [
  { name: "Phone Charms", slug: "phone-charms", accent: "#FFB7CE" },
  { name: "Keychains/Worry Stones", slug: "keychains-worry-stones", accent: "#E0BBE4" },
  { name: "Bookmarks", slug: "bookmarks", accent: "#98FFD9" },
  { name: "Paintings", slug: "paintings", accent: "#FDFFAB" },
  { name: "Bag Charms", slug: "bag-charms", accent: "#FFD3B0" },
  { name: "Fridge Magnets", slug: "fridge-magnets", accent: "#AEE2FF" },
  { name: "Tote Bags", slug: "tote-bags", accent: "#C7CEEA" },
  { name: "Stickers", slug: "stickers", accent: "#FFAAA7" },
].map(({ name, slug, accent }) => ({
  id: `cat-${slug}`,
  name,
  slug,
  accentColor: accent,
  shadowColor: accent,
  image: CATEGORY_PLACEHOLDER_IMAGE,
}));

const DESCRIPTION =
  "Each piece is crafted with intention and a sprinkle of studio magic. Small, beautiful objects have the power to turn your daily ritual into a moment of pure creativity.";

const ARTISAN_NOTE =
  '"This piece was inspired by the quiet morning light hitting the studio floor. Every detail was mixed and finished by hand to capture that exact translucent quality." — Lucy';

const PRODUCTS: Product[] = [
  {
    id: "prod-lavender-whisper-charm",
    name: "Lavender Whisper Charm",
    slug: "lavender-whisper-charm",
    priceCents: 1800,
    currency: "USD",
    description: DESCRIPTION,
    artisanNote: ARTISAN_NOTE,
    stockCount: 5,
    images: [IMG.lavenderCharm],
    categorySlug: "phone-charms",
    isBestSeller: true,
    isNewArrival: false,
  },
  {
    id: "prod-midnight-hillside-bookmark",
    name: "Midnight Hillside Bookmark",
    slug: "midnight-hillside-bookmark",
    priceCents: 1250,
    currency: "USD",
    description: DESCRIPTION,
    artisanNote: ARTISAN_NOTE,
    stockCount: 12,
    images: [IMG.midnightBookmark],
    categorySlug: "bookmarks",
    isBestSeller: true,
    isNewArrival: false,
  },
  {
    id: "prod-ocean-breeze-worry-stone",
    name: "Ocean Breeze Worry Stone",
    slug: "ocean-breeze-worry-stone",
    priceCents: 2200,
    currency: "USD",
    description: DESCRIPTION,
    artisanNote: ARTISAN_NOTE,
    stockCount: 8,
    images: [IMG.oceanWorryStone],
    categorySlug: "keychains-worry-stones",
    isBestSeller: true,
    isNewArrival: false,
  },
  {
    id: "prod-minimalist-profile-tote",
    name: "Minimalist Profile Tote",
    slug: "minimalist-profile-tote",
    priceCents: 3400,
    currency: "USD",
    description: DESCRIPTION,
    artisanNote: ARTISAN_NOTE,
    stockCount: 15,
    images: [IMG.minimalistTote],
    categorySlug: "tote-bags",
    isBestSeller: false,
    isNewArrival: true,
  },
  {
    id: "prod-monstera-trinket-dish",
    name: "Monstera Trinket Dish",
    slug: "monstera-trinket-dish",
    priceCents: 2600,
    currency: "USD",
    description: DESCRIPTION,
    artisanNote: ARTISAN_NOTE,
    stockCount: 6,
    images: [IMG.monsteraDish],
    categorySlug: "keychains-worry-stones",
    isBestSeller: false,
    isNewArrival: true,
  },
  {
    id: "prod-botanical-sticker-pack",
    name: "Botanical Sticker Pack",
    slug: "botanical-sticker-pack",
    priceCents: 1000,
    currency: "USD",
    description: DESCRIPTION,
    artisanNote: ARTISAN_NOTE,
    stockCount: 40,
    images: [IMG.botanicalStickers],
    categorySlug: "stickers",
    isBestSeller: false,
    isNewArrival: true,
  },
  {
    id: "prod-worry-stone-set",
    name: "Worry Stone Set",
    slug: "worry-stone-set",
    priceCents: 3200,
    currency: "USD",
    description: DESCRIPTION,
    artisanNote: ARTISAN_NOTE,
    stockCount: 5,
    images: [IMG.worryStoneSet],
    categorySlug: "keychains-worry-stones",
    isBestSeller: false,
    isNewArrival: false,
  },
  {
    id: "prod-minimalist-tote",
    name: "Minimalist Tote",
    slug: "minimalist-tote",
    priceCents: 1800,
    currency: "USD",
    description: DESCRIPTION,
    artisanNote: ARTISAN_NOTE,
    stockCount: 9,
    images: [IMG.minimalistTote],
    categorySlug: "tote-bags",
    isBestSeller: false,
    isNewArrival: false,
  },
  {
    id: "prod-sticker-sheet-dreamy",
    name: "Sticker Sheet 'Dreamy'",
    slug: "sticker-sheet-dreamy",
    priceCents: 800,
    currency: "USD",
    description: DESCRIPTION,
    artisanNote: ARTISAN_NOTE,
    stockCount: 30,
    images: [IMG.dreamyStickers],
    categorySlug: "stickers",
    isBestSeller: false,
    isNewArrival: false,
  },
  {
    id: "prod-ceramic-paint-palette",
    name: "Ceramic Paint Palette",
    slug: "ceramic-paint-palette",
    priceCents: 4500,
    currency: "USD",
    description: DESCRIPTION,
    artisanNote: ARTISAN_NOTE,
    stockCount: 4,
    images: [IMG.ceramicPalette],
    categorySlug: "stationery",
    isBestSeller: false,
    isNewArrival: false,
  },
  {
    id: "prod-hand-bound-journal",
    name: "Hand-Bound Journal",
    slug: "hand-bound-journal",
    priceCents: 3800,
    currency: "USD",
    description: DESCRIPTION,
    artisanNote: ARTISAN_NOTE,
    stockCount: 7,
    images: [IMG.handBoundJournal],
    categorySlug: "bookmarks",
    isBestSeller: false,
    isNewArrival: false,
  },
];

export async function getCategories(): Promise<Category[]> {
  return CATEGORIES;
}

export async function getCategoryBySlug(
  slug: string,
): Promise<Category | undefined> {
  return CATEGORIES.find((c) => c.slug === slug);
}

export async function getAllProducts(): Promise<Product[]> {
  return PRODUCTS;
}

export async function getProductsByCategory(slug?: string): Promise<Product[]> {
  if (!slug) return PRODUCTS;
  return PRODUCTS.filter((p) => p.categorySlug === slug);
}

export async function getBestSellers(): Promise<Product[]> {
  return PRODUCTS.filter((p) => p.isBestSeller);
}

export async function getNewArrivals(): Promise<Product[]> {
  return PRODUCTS.filter((p) => p.isNewArrival);
}

/**
 * Wishlist is user-specific and depends on persisted favorites, which do not
 * exist yet (no Auth/Supabase). Returns empty for now; swap the body when the
 * backend lands.
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
      products: PRODUCTS,
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

  const category = await getCategoryBySlug(slug);
  if (category) {
    return {
      title: category.name,
      eyebrow: "Category",
      products: await getProductsByCategory(slug),
      categorySlug: slug,
    };
  }

  // Unknown slug → fall back to the full collection.
  return {
    title: "All Items",
    eyebrow: "The Full Collection",
    products: PRODUCTS,
  };
}
