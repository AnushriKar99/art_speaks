# CLAUDE.md

Guidance for Claude Code (claude.ai/code) working in this repository.

> **Kept deliberately short.** An earlier version of this file grew detailed
> enough to drift badly out of date — it described mock data long after the
> storefront read Supabase, and documented two files that had been deleted. A
> stale architecture doc is worse than none, because it is trusted. So this one
> records only what is slow to discover from the code, and points at the code
> for everything else.

## Project

`Art Speaks` — an e-commerce storefront for a handcrafted art studio in India
(phone charms, worry stones, bookmarks, paintings, embroidery). Built from
Google Stitch design exports; "Pastel Artisan" / kawaii-artisanal aesthetic.

## Commands

```bash
npm run dev     # dev server (Turbopack) at :3000
npm run build   # production build — also typechecks and lints
npm run lint
npm run e2e     # Playwright; needs .env.test (see .env.test.example)
npm run e2e:ui  # same, watching in a browser
npx tsc --noEmit
```

**Never run `npm run build` while `npm run dev` is running.** They share
`.next`, and building strands the dev server without its manifests — every
route 500s until it is restarted. This has caught us repeatedly. The e2e suite
avoids it with `NEXT_DIST_DIR`.

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind v4 · Supabase
(Postgres + Auth + Storage) · Playwright.

Tailwind is configured entirely in `app/globals.css` via `@theme` — there is
**no** `tailwind.config.js`. All colours, spacing, the type scale and the
bespoke kawaii classes live there.

## The things worth knowing before changing anything

**Money is integers, in paise.** `price_cents`, `total_cents` and
`unit_price_cents` hold ₹×100 — ₹450 is `45000`. The `_cents` name is a wart
kept on purpose: it is the standard term for a currency's minor unit, and
renaming would touch six columns plus the TypeScript types. Forms take rupees
and convert; only the database sees paise.

**Security lives in the database, not the UI.** RLS decides what a request may
do; `requireAdmin()` and the middleware only decide what renders. See
`docs/LEARNING-auth-and-backend.md` for the full picture — it is the best
starting point for anyone new here.

**The storefront reads through a sessionless client** (`lib/supabase/public.ts`)
so it always shows what a visitor sees. Admin reads use the session client
(`lib/data/admin.ts`), which sees unpublished work too. Do not mix them.

**Prices are never sent from the browser.** `place_whatsapp_order` takes product
ids and quantities only, and reads prices from the products table itself. There
is no parameter through which a price could arrive.

**Stock moves on confirmation, not on order.** An order is `pending` until
marked paid; the trigger in `0010`/`0014` deducts then, and restores if it
leaves paid. Offline sales are written straight to `paid`.

**Redirects go through `lib/safe-redirect.ts`.** A `startsWith("/")` check is
not enough — `/\evil.com` passes it and resolves off-site.

## Layout

- `app/` — routes. `(dashboard)` is a route group: it does not appear in the
  URL, and exists so `requireAdmin()` in its layout guards every admin page
  without guarding `/admin/login`.
- `lib/data/` — every database read. `products.ts` is the storefront,
  `admin.ts` the studio.
- `supabase/migrations/` — numbered, append-only, idempotent. Never edit an
  applied one; add the next number.
- `supabase/setup_new_project.sql` — every migration and seed in one paste, for
  standing up a fresh project. **Generated** by `build_setup.sh`; edit the
  source, not the bundle.
- `e2e/` — Playwright specs. They run against a separate Supabase project,
  because checkout and admin tests write real orders and move real stock.

## Current state

Read `docs/ROADMAP.md`. It is kept current and says what is built, what is
deliberately not, and what is next.
