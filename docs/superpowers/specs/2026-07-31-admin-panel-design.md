# Art Speaks — Admin Panel Design

**Date:** 2026-07-31 · **Last updated:** 2026-08-05
**Status:** Phases 0–2 shipped. Phase 3 next.

Step markers: ✅ done · 🔄 changed during the build (see the note on the step)
· ⬜ not started. Anything marked 🔄 means the code and this document disagreed
until it was corrected here — the code is the truth.

| Phase | Status |
| --- | --- |
| 0 — Close the security hole, finish admin auth | ✅ code shipped; one dashboard check outstanding |
| 1 — Foundation: currency, storage, schema | ✅ code shipped; `0005` unverified |
| 2 — Admin shell | ✅ complete |
| **2.5 — Auth rework + customer accounts** | ✅ **complete — not in the original spec, added from feedback mid-build** |
| 3 — Inventory + storefront wiring | ⬜ next |
| 4 — Sales | ⬜ blocked on Phase 3 |

## Goal

Give the studio owner a single place to manage the shop: inventory, offline
sales, online orders, and sales reporting. Only flagged admins can reach it.

## Decisions

| Question | Decision | Why |
| --- | --- | --- |
| Currency | **INR** everywhere | Majority of sales are in India. Must land before real inventory is entered — changing it later means editing every product. |
| Offline sales storage | **`orders` table + `channel` column** | An offline sale is the same event as an online one (stock leaves, money arrives). Only provenance differs, and provenance is a column, not a table. |
| Offline line items | **`order_items` rows**, not a JSONB blob | Rejected `{product, qty}` JSON: it carries no price (so the revenue chart is impossible) and no foreign key (so the stock trigger cannot reliably find the product row). |
| Offline entry UX | **Photo grid, tap to add, with a search bar above** | 4 taps for a typical sale. The owner recognises their own work by sight; search keeps it fast past ~40 products. |
| Product images | **Supabase Storage, public-read bucket** | Current images are hotlinked Google CDN URLs from the Stitch export and will rot. Product photos are meant to be public, so signed URLs add expiry handling for no benefit. |
| Stock deduction | **Postgres trigger on `order_items`** | Application-level decrements drift when a request fails midway. A trigger makes the line item and the stock change one transaction, and covers offline sales for free. |
| Best sellers | **Keep the manual `is_best_seller` flag; show computed ranking beside it** | They answer different questions — computed is a report about the past, the flag is a merchandising decision about the future. A real best-seller may be out of stock or discontinued. |
| Login (added 2026-08-04) | **One `/login` for everyone; admin is a flag, not a separate door** | Admin is a property of an account, not a kind of account. A separate admin login meant an admin had no way into the shop and a customer had no way to an account. |
| Public signup (reversed 2026-08-04) | **Open** | Originally to be disabled, correctly, because no signup UI existed and an open endpoint was pure risk. Once customer accounts became real work, that reasoning inverted. Migration `0004` is what makes it safe. |

## Scope note

This is five phases, not one project. Each gets its own implementation plan and
ships independently. Phase 0 is a live security fix and must go first; the rest
run in order because each depends on the one before.

---

## Phase 0 — Close the security hole, finish admin auth

**This is live and exploitable today. Nothing else should start first.**

Public signup is enabled (`disable_signup: false`), `is_admin` lives on
`profiles`, and RLS policy `"own profile is updatable"` lets any authenticated
user update their own row. RLS gates rows, not columns, and Supabase grants
`authenticated` UPDATE on every column by default. So: stranger signs up →
`PATCH /rest/v1/profiles?id=eq.<own-id>` with `{"is_admin": true}` → admin.

1. ✅ **Migration `0004_lock_admin_flag.sql`**

   ```sql
   revoke update on public.profiles from authenticated;
   grant  update (full_name, phone, shipping_address)
     on public.profiles to authenticated;
   ```

   Table-level UPDATE implies all columns, so the revoke must come first.

2. 🔄 **~~Disable public signup~~ — REVERSED, signup stays open.**

   The original reasoning was sound at the time: no signup UI existed anywhere
   in the app, so an open `POST /auth/v1/signup` endpoint was pure risk with no
   benefit. It also allowed unbounded row creation in `auth.users` and
   `profiles`.

   That inverted once customer accounts became real work (Phase 2.5). Signup is
   now a deliberate feature, so it stays enabled — which makes step 1 the only
   thing standing between a new account and admin access. **This is why
   verifying `0004` matters more than anything else on this page.**

3. ✅ **Fix the redirect loop** in `lib/supabase/auth.ts`. A logged-in non-admin at
   `/admin` currently loops forever: middleware passes them through (they have a
   session), `requireAdmin()` redirects to `/admin/login`, middleware sees a
   logged-in user on the login page and redirects back to `/admin`. Send
   non-admins to `/` instead.

4. ✅ **Create the admin user** — Dashboard → Authentication → Users → Add user
   (auto-confirm), then:

   ```sql
   update public.profiles set is_admin = true
   where id = (select id from auth.users where email = '<owner email>');
   ```

5. 🔄 **Verify** — log in at **`/login`** (not `/admin/login`, which no longer
   exists as a page — see Phase 2.5), land on `/admin`. Confirmed working
   2026-08-01.

   ⬜ Still outstanding: create a second non-admin account and confirm it is
   bounced to `/` without looping, and confirm `0004` actually applied:

   ```sql
   select grantee, column_name from information_schema.column_privileges
   where table_schema='public' and table_name='profiles'
     and privilege_type='UPDATE' and grantee in ('authenticated','anon');
   ```

   Expect exactly `full_name`, `phone`, `shipping_address` for `authenticated`
   and nothing for `anon`. Column grants are not visible through the anon API,
   so this cannot be checked from the codebase.

**Done when:** the owner can log in, a non-admin cannot, and no user can set
their own `is_admin` via the REST API.

---

## Phase 1 — Foundation: currency, storage, schema

Everything the admin pages depend on. No UI in this phase.

6. ✅ **Migration `0005_currency_inr.sql`** — change `products.currency` and
   `orders.currency` defaults from `'USD'` to `'INR'` and update existing rows.

7. ✅ **`formatPrice` in `lib/types.ts`** — locale `en-US` → `en-IN`, default
   currency `USD` → `INR`, so prices render `₹1,250.00` with Indian digit
   grouping. `price_cents` now means paise; the integer convention is unchanged.

8. ✅ **Mock prices in `lib/data/products.ts`** — restate as INR. These stop
   mattering at Phase 3 but would otherwise show dollar amounts labelled `₹`.

9. ✅ **Storage bucket `product-images`** — public read; `insert`/`update`/`delete`
   gated on `public.is_admin()`, reusing the function from migration `0003`.

10. ✅ **`next.config.ts`** — add the Supabase Storage host to
    `images.remotePatterns` so `next/image` will render uploads.

11. ✅ **Migration `0006_sales_schema.sql`**

    ```sql
    alter table public.orders
      add column channel text not null default 'online'
        check (channel in ('online','offline')),
      alter column contact_email drop not null,
      add constraint orders_online_needs_email
        check (channel = 'offline' or contact_email is not null);
    ```

    The constraint relaxes the email requirement only for walk-ins, so online
    checkout cannot silently create orders with nobody to email.

12. ✅ **Stock decrement trigger**

    ```sql
    create or replace function public.decrement_stock()
    returns trigger language plpgsql security definer set search_path = public as $$
    begin
      update public.products
         set stock_count = greatest(stock_count - new.quantity, 0)
       where id = new.product_id;
      return new;
    end; $$;

    create trigger order_items_decrement_stock
      after insert on public.order_items
      for each row execute function public.decrement_stock();
    ```

    `greatest(..., 0)` matters: `stock_count` has a `check (stock_count >= 0)`
    constraint, so without the clamp, selling 3 of something the system thinks
    you have 2 of throws and the sale fails to record. Counts drift in real life;
    the database refusing to record a sale that physically happened is the wrong
    behaviour. Clamp, record, and surface the discrepancy on the low-stock view.

13. ✅ **Reporting views**

    ```sql
    create view public.monthly_sales as
      select date_trunc('month', created_at) as month,
             channel,
             count(*) as order_count,
             sum(total_cents) as revenue_cents
      from public.orders
      where status in ('paid','shipped','delivered')
      group by 1, 2;

    create view public.low_stock as
      select id, name, stock_count from public.products
      where is_active and stock_count <= 3
      order by stock_count;
    ```

    The `where` clause on `monthly_sales` matters — "sales" must mean paid
    orders, or the chart counts abandoned carts as revenue. Views inherit RLS
    from their underlying tables, so the Phase 0 admin policies already cover
    them and no new security surface is added.

**Done when:** migrations applied, a file can be uploaded to the bucket and
rendered by `next/image`, and inserting an `order_items` row visibly decrements
`products.stock_count`.

---

## Phase 2 — Admin shell

14. 🔄 **`app/admin/(dashboard)/layout.tsx`** — calls `requireAdmin()` once and
    renders the nav. Child pages inherit the guard instead of repeating it.

    Landed one folder deeper than planned, inside a `(dashboard)` route group.
    Parentheses keep the folder out of the URL, so `(dashboard)/page.tsx` still
    serves `/admin` — the group exists purely to draw a guard boundary that the
    URL doesn't see.

    Nav shipped as **Dashboard · Inventory · Record sale · Sales · Orders** —
    five, not the four listed here. `/admin` was otherwise unreachable from the
    mobile tab bar.

15. 🔄 **~~Move `/admin/login` out of the guarded layout~~ — no longer applies.**

    The problem this solved disappeared in Phase 2.5: there is no admin-only
    login page to protect from the guard. `/admin/login` is now a redirect to
    `/login?next=/admin`, kept only so old bookmarks still land somewhere
    sensible. The middleware skips gating that one path, or a logged-out
    visitor would bounce through it twice.

**Note:** the layout guard is UX, not security. It renders the right thing; it
does not stop a crafted request to a Server Action. The real boundary is the RLS
from migration `0003`. Every admin write goes through the user's own session so
RLS actually evaluates — **do not use `SUPABASE_SERVICE_ROLE_KEY` for admin
CRUD**, as it bypasses RLS entirely and turns one leaked key into total database
access.

**Done when:** all four nav destinations exist as stubs, guarded, and the login
page still works. ✅ Verified 2026-08-05 — every `/admin*` route 307s to
`/login` with the correct `?next=`, and `/login` returns 200.

---

## Phase 2.5 — Auth rework and customer accounts ✅

**Not in the original spec.** It came out of feedback after Phase 2 shipped:
*"the login should be same for both the admin and a normal user… as an admin I
should have the access for both the UX"*.

The original design gave admins their own door at `/admin/login`. That was
wrong, and the shape of the wrongness is worth recording: **admin is a property
of an account, not a kind of account.** A separate admin login meant an admin
had no route back into the shop, and a customer had no route to an account at
all.

### What shipped

- ⬜→✅ **`/login`** — one sign-in page for everyone. Honours `?next=` so anyone
  bounced out of a page returns to it, and rejects any value that isn't a
  same-site path. Without that check, `/login?next=https://evil.example` turns
  our own login into an **open redirect**. `//evil.example` is rejected too — it
  passes a naive `startsWith("/")` while browsers treat it as external.
- ✅ **`/signup`** — name, email, password. `full_name` goes into user metadata,
  which the `handle_new_user` trigger from `0001` already reads to populate the
  `profiles` row, so no schema change was needed.
- ✅ **`/auth/confirm`** — a Route Handler that exchanges the emailed token for a
  session. Without it the confirmation link has nowhere to land and every
  account stays unconfirmed.
- ✅ **Account menu** (`components/layout/account-menu.tsx`) — a Server Component
  so signed-in state is correct on first paint. Shows an **Admin Dashboard**
  link only when `is_admin` is true.
- ✅ **"Home" in the admin header** — the way back to the storefront.

### Two bugs found here, both worth remembering

**The redirect loop.** `requireAdmin()` sent non-admins to `/admin/login`, and
the middleware sent logged-in users off the login page to `/admin`. Each rule
was correct alone; together they pointed at each other and looped until the
browser gave up. Non-admins now go to `/`.

**Confirmation links reported as expired.** The handler only accepted
`token_hash`, but Supabase's default email template routes through its own
`/auth/v1/verify` and arrives with a PKCE `code` instead. Every real
confirmation hit the failure branch and told users their link had expired — the
link was fine; the code didn't recognise it. Both shapes are handled now, and
the real reason is surfaced instead of a generic message.

### Known limitation

The `code` path needs a verifier cookie from the browser that started signup, so
signing up on a laptop and opening the email on a phone fails. The fix is a
dashboard change, not code — switch the **Confirm signup** template to:

```html
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/">Confirm your email</a>
```

⬜ Still outstanding, along with allow-listing the Site URL and `/auth/confirm`
under Authentication → URL Configuration.

### Deliberately not built

No customer-facing screens sit behind an account yet — no order history, no
saved wishlist (`getWishlist()` still returns `[]`). Accounts are plumbing until
the storefront reads Supabase in Phase 3.

---

## Phase 3 — Inventory + storefront wiring

16. ⬜ **Inventory table** (`/admin/inventory`) — every product with name, category,
    price, stock, active/featured flags. Sortable, low-stock rows highlighted.

17. ⬜ **Add/edit product form** — all `products` columns plus image upload to the
    Phase 1 bucket, writing public URLs into `products.images` (already `text[]`,
    so multiple images per product work today). Deactivate via `is_active`
    rather than deleting, so historical `order_items` keep resolving.

18. ⬜ **Category CRUD** at `/admin/categories` — name, slug, accent colour, sort
    order, image. Separate page from inventory; the storefront's category
    scroller reads this table.

19. ⬜ **Swap `lib/data/products.ts` to Supabase** — replace the function bodies.
    The async signatures were designed for exactly this, so callers do not change.

20. ⬜ **Swap `lib/data/cart.ts`** similarly.

Steps 19–20 are sequenced here deliberately. Until the storefront reads Supabase,
adding a product in the admin panel changes nothing on `/shop` — so there is no
way to tell whether the panel works.

**Done when:** a product added in the admin panel appears on `/shop` with its
uploaded image and an INR price.

---

## Phase 4 — Sales

21. ⬜ **Record Offline Sale** (`/admin/sales/new`) — see the layout below.

### Offline sale entry — approved layout

Phone-first: this gets used standing at a market stall or on the sofa that
evening. The metric is **taps per sale**, not how the screen looks. A typical
3-product sale is **4 taps**.

```
┌───────────────────────────────────────┐
│  Record Sale                Today ▾   │  date chip — defaults today,
├───────────────────────────────────────┤  one tap to back-date
│  🔍  Search products…                 │  filters the grid as you type
├───────────────────────────────────────┤
│   ┌─────┐②    ┌─────┐①    ┌─────┐①   │  badge = qty in this sale
│   │ IMG │     │ IMG │     │ IMG │    │
│   └─────┘     └─────┘     └─────┘    │
│   Lavender    Ocean       Bookmark    │
│   ₹450 · 12   ₹550 · 4    ₹300 · 0 ⚠  │  price · stock left
│                                       │
│   ┌─────┐     ┌─────┐     ┌─────┐    │
│   │ IMG │     │ IMG │     │ IMG │    │
│   └─────┘     └─────┘     └─────┘    │
│   Tote        Stickers    Journal     │
│   ₹800 · 6    ₹150 · 20   ₹1200 · 3   │
├───────────────────────────────────────┤
│   4 items                             │
│   ₹1,450                  [  Save  ]  │
└───────────────────────────────────────┘
```

**Interaction rules**

| Gesture | Result |
| --- | --- |
| Tap a tile | quantity +1; badge appears |
| Tap again | +1 again (2 taps = qty 2) |
| Long-press a tile | remove from sale (qty → 0, badge clears) |
| Tap the price | inline edit — market discounts, bundle deals |
| Tap the date chip | date picker, defaults to today |
| Tap Save | one Server Action, one transaction |

**Why this shape.** The owner recognises their own work by sight, so a photo
grid needs no reading and no typing. Search only matters past ~40 products, at
which point the grid would otherwise become a scroll-hunt. Rejected: a
search-and-add list (~20 interactions per sale) and a full scrolling tally sheet
(4 taps, but you scroll past 44 zeroes to reach the 4 that sold).

The rendered mockups of all three options are kept at
`assets/2026-07-31-offline-entry-mockups.html` — open it in a browser to see the
comparison this decision came from.

**Stock display is load-bearing.** Each tile shows units remaining. A tile
reading `· 0 ⚠` for something you just sold two of is how count drift becomes
visible at the moment you can still remember what happened, rather than months
later. It does not block the sale — see the `greatest(..., 0)` clamp in step 12.

**On submit**, one Server Action in a single transaction inserts an `orders` row
(`channel='offline'`, `status='paid'`, `contact_email` null, `created_at` set
from the date chip) plus one `order_items` row per tile with a badge. The Phase 1
trigger decrements stock. If any insert fails the whole transaction rolls back —
a half-recorded sale is worse than none.

22. ⬜ **Sales chart** (`/admin/sales`) — monthly revenue from `monthly_sales`,
    stacked by channel. Aggregation happens in Postgres, not in the browser.

23. ⬜ **Best sellers** — computed ranking from `order_items` shown beside the
    manual `is_best_seller` toggle, so the owner sees what actually sold and then
    decides what to feature.

24. ⬜ **Orders page** (`/admin/orders`) — list online orders, view line items,
    update `status` through the existing `pending → paid → shipped → delivered`
    flow.

**Done when:** an offline sale can be recorded in under 30 seconds, it decrements
stock, and it appears in both the revenue chart and the best-seller ranking.

---

## Where the Supabase wiring actually happens

There is no single "connect the backend" step — it is spread across the phases,
because each page wires up the slice it needs. This table is the answer to
"when does X start talking to Supabase":

| Piece | Reads / writes | Where | Phase |
| --- | --- | --- | --- |
| Admin auth | `auth.getUser()`, `profiles.is_admin` | `lib/supabase/auth.ts` | ✅ Phase 0 |
| Session refresh + `/admin` gate | auth cookies | `proxy.ts` → `lib/supabase/middleware.ts` | ✅ Phase 0 |
| Sign in | `signInWithPassword` | `components/auth/login-form.tsx` | ✅ Phase 2.5 |
| Sign up | `signUp`, writes `profiles` via the `0001` trigger | `components/auth/signup-form.tsx` | ✅ Phase 2.5 |
| Email confirmation | `verifyOtp` / `exchangeCodeForSession` | `app/auth/confirm/route.ts` | ✅ Phase 2.5 |
| Account menu / admin link | reads own `profiles.is_admin` | `components/layout/account-menu.tsx` | ✅ Phase 2.5 |
| Product / category admin CRUD | writes `products`, `categories` | Server Actions under `app/admin/` | Phase 3, steps 16–18 |
| Image upload | writes Storage bucket, then `products.images` | product form | Phase 3, step 17 |
| **Storefront product reads** | reads `products`, `categories` | `lib/data/products.ts` — replace the function bodies | Phase 3, step 19 |
| Cart | reads `products` | `lib/data/cart.ts` | Phase 3, step 20 |
| Offline sale | writes `orders` + `order_items` | Server Action | Phase 4, step 21 |
| Sales chart | reads `monthly_sales` view | `/admin/sales` | Phase 4, step 22 |
| Best sellers | reads `order_items`, writes `products.is_best_seller` | `/admin/sales` | Phase 4, step 23 |
| Order status | reads/writes `orders` | `/admin/orders` | Phase 4, step 24 |

Everything goes through the **user's own session** so RLS evaluates on every
query. The client helpers (`lib/supabase/client.ts`, `server.ts`) already exist
and do not change.

The storefront swap (step 19) is the one people expect to be last. It is not —
it sits mid-Phase-3 because until `/shop` reads Supabase, adding a product in the
admin panel changes nothing visible, and there is no way to tell whether the
inventory page works.

## Deferred (explicitly out of scope)

- Cart persistence, checkout, and payment — `orders.payment_id` is already
  provider-neutral and waiting.
- ~~Customer accounts~~ — **built in Phase 2.5.** The Phase 0 column grant is
  now what keeps `is_admin` safe, exactly as anticipated here.
- Wishlist persistence — still deferred. `getWishlist()` returns `[]` and the
  heart buttons are stubs, though the `wishlist` table and its RLS exist.
- Storefront search.
- Offline refunds and returns.
- Audit logging of admin changes — one admin, not yet worth it.

## Open risk

`SUPABASE_SERVICE_ROLE_KEY` is currently unset, which is correct. It stays unset
until server-side order creation at checkout, and is never used for admin CRUD.
