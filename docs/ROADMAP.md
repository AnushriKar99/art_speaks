# Art Speaks — Roadmap

Living backlog. The phase design lives in
[`superpowers/specs/2026-07-31-admin-panel-design.md`](superpowers/specs/2026-07-31-admin-panel-design.md);
this file tracks everything, including work outside those phases.

Last updated 2026-07-31.

---

## Done

- **Phase 0 — admin auth.** Migration `0004` locks `is_admin` against
  self-assignment (RLS gates rows, not columns, so it takes column GRANTs).
  Fixed the redirect loop that trapped logged-in non-admins. Admin user created.
- **Phase 1 — foundation.** INR currency (`0005`), offline-sale schema, stock
  trigger and reporting views (`0006`), Storage bucket, Storage host registered
  for `next/image`.
- **Phase 2 — admin shell.** Guarded `(dashboard)` route group, nav that mirrors
  the storefront's tab bar on mobile.
- **Auth flow rework.** One `/login` for everyone; admin is a flag, not a
  separate door. Customer signup with email confirmation at `/auth/confirm`,
  handling both the `token_hash` and `code` callback shapes.

## Verify (blocked on dashboard access)

- [ ] **Confirm `0004` applied.** Column grants aren't visible through the anon
      API. Expect exactly `full_name`, `phone`, `shipping_address` for
      `authenticated`, and nothing for `anon`:
      ```sql
      select grantee, column_name from information_schema.column_privileges
      where table_schema='public' and table_name='profiles'
        and privilege_type='UPDATE' and grantee in ('authenticated','anon');
      ```
      This is the only thing stopping a stranger who signs up from making
      themselves an admin.
- [ ] **Confirm `0005` applied** — `products.currency` / `orders.currency`
      should default to `'INR'`.
- [ ] **Auth URL configuration** — *deferred to deployment (2026-08-05).* Site
      URL and a `http://localhost:3000/**` redirect entry are needed before
      **customer signup** can be tested; admin login is unaffected because that
      user was created directly and never needed a confirmation email. Set both
      the production domain and the localhost entry when deploying.
- [ ] **Switch the signup email template** to the `token_hash` form. The default
      template's PKCE `code` only works in the browser that signed up, so
      signing up on a laptop and opening the email on a phone fails:
      ```html
      <a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/">Confirm your email</a>
      ```

---

## Next

### 1. Phase 3 — inventory + storefront wiring
Inventory table, add/edit product form with image upload, category CRUD, then
swap `lib/data/products.ts` and `lib/data/cart.ts` to read Supabase.

Done when a product added in the admin panel appears on `/shop` with its
uploaded image and an INR price.

Two mock-data problems disappear with this work: one product still points at a
`"stationery"` category that no longer exists (invisible under every filter),
and all 8 category cards share one placeholder image.

### 2. Phase 4 — sales
Offline sale entry (the approved tap-grid), monthly revenue chart, computed
best-sellers beside the Featured toggle, and the orders page.

Depends on Phase 3: the entry screen is a grid of product tiles, so it can't be
built or tested against an empty products table.

### 3. Content — My Journey and About Us
Copy and layout for `components/home/about-section.tsx` and `/about`. No
specifics agreed yet.

### 4. Admin dashboard design review
The `/admin` landing page is four cards linking onward. To be reviewed and
redesigned after using it — no defined change yet.

### 5. Deploy
Everything currently points at `localhost:3000` — Supabase Site URL, auth
redirect URLs, the Storage host in `next.config.ts`. Payment cannot be tested
properly without a real domain, so this comes before it.

### 6. Cart persistence
Prerequisite for payment. Add-to-cart buttons on the home carousels and shop
grid are non-functional stubs, `/cart` renders two hardcoded items from
`lib/data/cart.ts`, and "Proceed to Checkout" is a styled no-op.

### 7. Payment
`orders.payment_id` is deliberately provider-neutral. **Razorpay** is the better
fit than Stripe: amounts are already in paise, and Stripe's India support for
domestic cards is awkward. Order creation happens server-side after payment
confirms — the one legitimate use for `SUPABASE_SERVICE_ROLE_KEY`, which stays
unset until then.

---

## Also outstanding

| Item | Notes |
| --- | --- |
| Add-to-cart animation | The item should visibly fly into the basket when added, rather than only the header count changing. Purely presentational — the cart itself works. |
| Wishlist persistence | `getWishlist()` returns `[]`; every heart button is a stub. The `wishlist` table and its RLS already exist, unused. First thing a customer account is actually for. |
| ~~Storefront search~~ | **Done** — substring match across name, description, artisan note, slug and category, with pg_trgm typo tolerance as a fallback. |
| Category images | The 8 product photos are uploaded and served from Supabase Storage. Categories still share one hotlinked Stitch placeholder (`image_url` is null on all 8). |
| Logo image in the hero | Requested 2026-07-20, asset never supplied. |
| ~~Custom order section image~~ | **Done** — a real studio flat-lay, served from `public/images/`. |
| Custom order form doesn't submit | Pre-fills a WhatsApp message; it cannot send. A Server Action would make it a real enquiry. |
| **No test suite** | Nothing is covered. Worth adding around the money paths — stock decrement, order totals — before payment ships. |

## Not doing (for now)

- Offline refunds and returns.
- Audit logging of admin changes — one admin, not yet worth it.
