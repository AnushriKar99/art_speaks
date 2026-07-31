# Art Speaks — Admin Panel Design

**Date:** 2026-07-31
**Status:** Approved design, pending implementation plans

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

1. **Migration `0004_lock_admin_flag.sql`**

   ```sql
   revoke update on public.profiles from authenticated;
   grant  update (full_name, phone, shipping_address)
     on public.profiles to authenticated;
   ```

   Table-level UPDATE implies all columns, so the revoke must come first.

2. **Disable public signup** — Dashboard → Authentication → Providers → Email →
   turn off "Enable sign ups". No customer accounts exist yet, so nothing breaks.

3. **Fix the redirect loop** in `lib/supabase/auth.ts`. A logged-in non-admin at
   `/admin` currently loops forever: middleware passes them through (they have a
   session), `requireAdmin()` redirects to `/admin/login`, middleware sees a
   logged-in user on the login page and redirects back to `/admin`. Send
   non-admins to `/` instead.

4. **Create the admin user** — Dashboard → Authentication → Users → Add user
   (auto-confirm), then:

   ```sql
   update public.profiles set is_admin = true
   where id = (select id from auth.users where email = '<owner email>');
   ```

5. **Verify** — log in at `/admin/login`, land on `/admin`. Create a second
   non-admin user and confirm it is bounced to `/` without looping.

**Done when:** the owner can log in, a non-admin cannot, and no user can set
their own `is_admin` via the REST API.

---

## Phase 1 — Foundation: currency, storage, schema

Everything the admin pages depend on. No UI in this phase.

6. **Migration `0005_currency_inr.sql`** — change `products.currency` and
   `orders.currency` defaults from `'USD'` to `'INR'` and update existing rows.

7. **`formatPrice` in `lib/types.ts`** — locale `en-US` → `en-IN`, default
   currency `USD` → `INR`, so prices render `₹1,250.00` with Indian digit
   grouping. `price_cents` now means paise; the integer convention is unchanged.

8. **Mock prices in `lib/data/products.ts`** — restate as INR. These stop
   mattering at Phase 3 but would otherwise show dollar amounts labelled `₹`.

9. **Storage bucket `product-images`** — public read; `insert`/`update`/`delete`
   gated on `public.is_admin()`, reusing the function from migration `0003`.

10. **`next.config.ts`** — add the Supabase Storage host to
    `images.remotePatterns` so `next/image` will render uploads.

11. **Migration `0006_sales_schema.sql`**

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

12. **Stock decrement trigger**

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

13. **Reporting views**

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

14. **`app/admin/layout.tsx`** — calls `requireAdmin()` once and renders the nav
    (Inventory · Record Sale · Sales · Orders). Child pages inherit the guard
    instead of repeating it.

15. **Move `/admin/login` out of the guarded layout** — a route group such as
    `app/(admin-auth)/admin/login/` — or the guard fights the login page.

**Note:** the layout guard is UX, not security. It renders the right thing; it
does not stop a crafted request to a Server Action. The real boundary is the RLS
from migration `0003`. Every admin write goes through the user's own session so
RLS actually evaluates — **do not use `SUPABASE_SERVICE_ROLE_KEY` for admin
CRUD**, as it bypasses RLS entirely and turns one leaked key into total database
access.

**Done when:** all four nav destinations exist as stubs, guarded, and the login
page still works.

---

## Phase 3 — Inventory + storefront wiring

16. **Inventory table** (`/admin/inventory`) — every product with name, category,
    price, stock, active/featured flags. Sortable, low-stock rows highlighted.

17. **Add/edit product form** — all `products` columns plus image upload to the
    Phase 1 bucket, writing public URLs into `products.images` (already `text[]`,
    so multiple images per product work today). Deactivate via `is_active`
    rather than deleting, so historical `order_items` keep resolving.

18. **Category CRUD** at `/admin/categories` — name, slug, accent colour, sort
    order, image. Separate page from inventory; the storefront's category
    scroller reads this table.

19. **Swap `lib/data/products.ts` to Supabase** — replace the function bodies.
    The async signatures were designed for exactly this, so callers do not change.

20. **Swap `lib/data/cart.ts`** similarly.

Steps 19–20 are sequenced here deliberately. Until the storefront reads Supabase,
adding a product in the admin panel changes nothing on `/shop` — so there is no
way to tell whether the panel works.

**Done when:** a product added in the admin panel appears on `/shop` with its
uploaded image and an INR price.

---

## Phase 4 — Sales

21. **Record Offline Sale** (`/admin/sales/new`) — see the layout below.

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

22. **Sales chart** (`/admin/sales`) — monthly revenue from `monthly_sales`,
    stacked by channel. Aggregation happens in Postgres, not in the browser.

23. **Best sellers** — computed ranking from `order_items` shown beside the
    manual `is_best_seller` toggle, so the owner sees what actually sold and then
    decides what to feature.

24. **Orders page** (`/admin/orders`) — list online orders, view line items,
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
| Admin auth | `auth.getUser()`, `profiles.is_admin` | `lib/supabase/auth.ts` | **already wired** — Phase 0 only fixes defects |
| Session refresh + `/admin` gate | auth cookies | `proxy.ts` → `lib/supabase/middleware.ts` | **already wired** |
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
- Customer accounts and wishlist persistence. When these land, the Phase 0
  column grant is what keeps `is_admin` safe.
- Storefront search.
- Offline refunds and returns.
- Audit logging of admin changes — one admin, not yet worth it.

## Open risk

`SUPABASE_SERVICE_ROLE_KEY` is currently unset, which is correct. It stays unset
until server-side order creation at checkout, and is never used for admin CRUD.
