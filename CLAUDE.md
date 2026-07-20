# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

`Art Speaks` — an e-commerce storefront for a handcrafted art studio (phone
charms, worry stones, bookmarks, stationery). Built from Google Stitch design
exports ("Pastel Artisan" / kawaii-artisanal aesthetic). Two pages exist so far:
the **homepage** (`/`) and the **shop / all-items page** (`/shop`).

## Commands

```bash
npm run dev     # start dev server (Turbopack) at http://localhost:3000
npm run build   # production build (also runs typecheck + eslint)
npm run start   # serve the production build
npm run lint    # eslint only
npx tsc --noEmit  # typecheck only
```

There is no test suite yet.

## Stack

- **Next.js 16** (App Router, Turbopack) + **React 19** + **TypeScript**
- **Tailwind CSS v4** — configured entirely in `app/globals.css` via `@theme`
  tokens (there is **no** `tailwind.config.js`). PostCSS plugin `@tailwindcss/postcss`.
- `next/font/google` self-hosts Plus Jakarta Sans, Be Vietnam Pro, Hanken Grotesk.
- Material Symbols Outlined is loaded via a plain `<link>` in `app/layout.tsx`
  (variable icon-font axes don't play well with `next/font`).

## Architecture

- `app/layout.tsx` — root layout: fonts, Material Symbols link, `<body>` shell.
- `app/page.tsx` — homepage (async Server Component). Composes `components/home/*`.
- `app/shop/page.tsx` — all-items page (async Server Component). Reads
  `?category=<slug>` via `await searchParams` (Next 16 dynamic APIs are async)
  and filters the grid; no param → "All Items".
- `components/layout/` — `site-header` (homepage, client: menu drawer),
  `shop-header` (sticky, client: menu + search toggle), `site-footer` (server),
  `bottom-tab-bar` (client, `usePathname` for active tab; shown on `/shop`).
- `components/home/` — hero, `product-carousel` (client, shared by Best Sellers
  + New Arrivals, has scroll arrows + "View more" → `/shop`), `category-scroller`
  (cards → `/shop?category=slug`), `custom-order-form` (client), about, reviews,
  decorative-blobs.
- `components/product/` — `product-grid` (client, owns modal open state),
  `product-card` (client, opens modal; favorite/cart buttons are stubs),
  `product-modal` (client, qty stepper + Esc/scroll-lock), `category-filter` chips.
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

## Data layer

`lib/data/products.ts` currently returns **local mock data** (sourced from the
Stitch export) through async functions — `getBestSellers`, `getNewArrivals`,
`getCategories`, `getCategoryBySlug`, `getAllProducts`, `getProductsByCategory`.
Types live in `lib/types.ts` (`Product` uses `priceCents`/`currency`, Stripe-shaped;
`formatPrice` helper). The async signatures intentionally mirror the planned
Supabase layer so swapping the function bodies is a drop-in change.

Product/category imagery is currently hotlinked from `lh3.googleusercontent.com`
(allowlisted in `next.config.ts` `images.remotePatterns`).

## Not built yet (intentional stubs)

Cart/checkout/Stripe, Supabase backend + Auth, wishlist persistence, and search
are not implemented. Add-to-cart, favorite, "Me" tab, and the custom-order form
submit are UI stubs (no persistence). When wiring Supabase, replace the bodies in
`lib/data/products.ts`, add the Storage host to `next.config.ts`, and back the
custom-order form with a Server Action.
