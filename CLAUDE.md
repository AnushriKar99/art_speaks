# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

`Art Speaks` — an e-commerce storefront for a handcrafted art studio (phone
charms, worry stones, bookmarks, stationery). Built from Google Stitch design
exports ("Pastel Artisan" / kawaii-artisanal aesthetic).

Pages: **homepage** (`/`), **shop / all-items** (`/shop`), **cart** (`/cart`),
**about** (`/about`), **refund policy** (`/refund-policy`), and a password-gated
**admin area** (`/admin`, `/admin/login`).

## Commands

```bash
npm run dev     # start dev server (Turbopack) at http://localhost:3000
npm run build   # production build (also runs typecheck + eslint)
npm run start   # serve the production build
npm run lint    # eslint only
npx tsc --noEmit  # typecheck only
```

There is no test suite yet. `app/layout.tsx` has one known, accepted eslint
warning (`no-page-custom-font`, from the Material Symbols `<link>`).

## Stack

- **Next.js 16** (App Router, Turbopack) + **React 19** + **TypeScript**
- **Tailwind CSS v4** — configured entirely in `app/globals.css` via `@theme`
  tokens (there is **no** `tailwind.config.js`). PostCSS plugin `@tailwindcss/postcss`.
- **Supabase** — `@supabase/supabase-js` + `@supabase/ssr` (Auth + Postgres).
- `next/font/google` self-hosts Fredoka (display/headline), Be Vietnam Pro (body), Hanken Grotesk (labels).
- Material Symbols Outlined is loaded via a plain `<link>` in `app/layout.tsx`
  (variable icon-font axes don't play well with `next/font`).

## Architecture

- `app/layout.tsx` — root layout: fonts, Material Symbols link, `<body>` shell.
- `app/page.tsx` — homepage (async Server Component). Composes `components/home/*`.
- `app/shop/page.tsx` — all-items page (async Server Component). Reads
  `?collection=<slug>` via `await searchParams` (Next 16 dynamic APIs are async)
  and resolves it through `getCollection`; no param → "All Items".
- `app/cart/page.tsx`, `app/about/page.tsx`, `app/refund-policy/page.tsx` —
  Server Components, each exporting `metadata`.
- `app/admin/` — `page.tsx` (guarded by `requireAdmin()`, sign-out Server Action)
  and `login/page.tsx` (client, email/password via `signInWithPassword`).
- `proxy.ts` → `lib/supabase/middleware.ts` — refreshes the Supabase session
  on every request and redirects logged-out visitors away from `/admin`.
  (`proxy.ts` is Next 16's rename of the old `middleware.ts` file convention;
  the exported function must be named `proxy`. The Supabase helper keeps the
  `middleware.ts` name to match Supabase's own docs.)
- `components/layout/` — `site-header` (homepage, client: menu drawer),
  `shop-header` (sticky, client: menu + search toggle), `header-nav` (client:
  desktop inline nav + Categories dropdown, mobile left panel), `site-footer`
  (server), `bottom-tab-bar` (client, `usePathname` for active tab; Shop /
  Gallery / Wishlist).
- `components/home/` — hero, `product-carousel` (client, shared by Best Sellers
  + New Arrivals, has scroll arrows + "View more"), `category-scroller`
  (cards → `/shop?collection=slug`), `custom-order-form` (client), about,
  `reviews-carousel`, decorative-blobs.
- `components/product/` — `product-grid` (client, owns modal open state),
  `product-card` (client, opens modal; favorite/cart buttons are stubs),
  `product-modal` (client, qty stepper + Esc/scroll-lock).
- `components/cart/cart-view.tsx` — client, renders the basket + qty steppers.
- `components/ui/` — `icon` (Material Symbols wrapper), `badge-sticker`,
  `section-heading`, `star-rating`.

### Design tokens
All ~40 colors, spacing (`gutter`, `margin-mobile`, etc.), the type scale
(`display-lg`, `headline-md`, `body-md`, `label-caps`…), and fonts live in the
`@theme` block in `app/globals.css`, which auto-generates utilities like
`bg-primary`, `text-headline-md`, `px-margin-mobile`, `gap-gutter`,
`font-display-lg`. Bespoke kawaii classes (`.checkered-pattern`, `.badge-sticker`,
`.tactile-button`, `.wobbly-border`, `.floating-doodle`, `.hide-scrollbar`) are
plain CSS lower in the same file.

## Supabase backend

Wired up but **not yet serving the storefront** — the schema, auth, and admin
gate exist; the product/cart reads are still mock (see Data layer).

- `lib/supabase/client.ts` — browser client (anon key), for Client Components.
- `lib/supabase/server.ts` — cookie-backed client for Server Components, Route
  Handlers, and Server Actions (Next 16's `cookies()` is async).
- `lib/supabase/middleware.ts` — session refresh + `/admin` redirect gate,
  invoked from the root `proxy.ts`.
- `lib/supabase/auth.ts` — `getUser()` and `requireAdmin()` (checks
  `profiles.is_admin`, redirects otherwise).
- `supabase/migrations/` — `0001_initial_schema.sql` (categories, products,
  profiles, orders, order_items, reviews, wishlist + RLS), `0002_add_product_flags.sql`
  (`is_best_seller` / `is_new_arrival`), `0003_admin_role.sql` (`is_admin` flag,
  `public.is_admin()` SECURITY DEFINER helper, admin RLS policies).
- `supabase/seed.sql`, `supabase/seed_categories.sql` — seed data ported from mock.
- Env vars in `.env.example`: `NEXT_PUBLIC_SUPABASE_URL`,
  `NEXT_PUBLIC_SUPABASE_ANON_KEY` (browser-safe), and a commented-out
  `SUPABASE_SERVICE_ROLE_KEY` (server only, for order creation later).

The `/admin` area is protected in three layers: middleware (logged in?),
`requireAdmin()` in the page (flagged admin?), and RLS in the database (can this
user actually write?).

## Data layer

`lib/data/products.ts` still returns **local mock data** (sourced from the Stitch
export) through async functions — `getCategories`, `getCategoryBySlug`,
`getAllProducts`, `getProductsByCategory`, `getBestSellers`, `getNewArrivals`,
`getWishlist` (returns `[]`), and `getCollection`. The async signatures
intentionally mirror the Supabase layer so swapping the function bodies is a
drop-in change.

`getCollection(slug?)` resolves the single `?collection=` param the `/shop` page
is driven by — a category slug, or one of `best-sellers` / `new-arrivals` /
`wishlist`, or undefined for the full collection — returning the products plus
the display copy (`title`, `eyebrow`).

`lib/data/cart.ts` holds cart types (`CartItem`) and `getCartItems()`, which
returns a mock basket. Cart code belongs here, **not** in `products.ts` / `types.ts`.

`lib/types.ts` — `Category`, `Product` (uses `priceCents`/`currency`,
Stripe-shaped), and the `formatPrice` helper.

`lib/contact.ts` — studio contact channels (WhatsApp number, email, Instagram)
and `buildWhatsAppLink()`, shared by the footer and the custom order form.

Product/category imagery is currently hotlinked from `lh3.googleusercontent.com`
(allowlisted in `next.config.ts` `images.remotePatterns`).

## Not built yet (intentional stubs)

Cart persistence, checkout/Stripe, customer accounts, wishlist persistence, and
search are not implemented. Add-to-cart, favorite, and the custom-order form
submit are UI stubs — the custom-order form pre-fills a WhatsApp message
(`buildWhatsAppLink`) rather than posting anywhere; it cannot auto-send.

To finish the backend swap: replace the bodies in `lib/data/products.ts` and
`lib/data/cart.ts` with Supabase queries, add the Storage host to
`next.config.ts`, and back the custom-order form with a Server Action.
