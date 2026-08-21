# Art Speaks — Roadmap

Living backlog. The phase design lives in
[`superpowers/specs/2026-07-31-admin-panel-design.md`](superpowers/specs/2026-07-31-admin-panel-design.md);
this file tracks everything, including work outside those phases.

Last updated 2026-08-18.

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
- **Phase 3 — inventory + storefront wiring.** Inventory table, add/edit form
  with in-browser image resizing, and the storefront reading Supabase. Category
  CRUD was skipped deliberately (see Not doing).
- **Phase 4 — sales.** Offline sale tap-grid, orders page, revenue by month
  split by channel, and computed best-sellers beside the Featured toggle.
- **Cart and checkout.** A real localStorage cart, an address form, and orders
  written by `place_whatsapp_order` — a SECURITY DEFINER function with no price
  parameter, so a browser cannot set what something costs.
- **Storefront search.** Substring match across every text column plus category,
  with pg_trgm typo tolerance as a fallback.
- **Moved the project to ap-south-1 (Mumbai).** Page renders went from ~440ms to
  ~125ms; category caching took `/about` to 4ms.
- **Accounts, end to end.** Signup signs people straight in (confirmation off —
  see the note under Deploy for why, and when to reverse it). Forgotten
  passwords have a real recovery flow: `/forgot-password` sends the link,
  `/auth/reset` lands it, `/reset-password` sets the new one. Verified working
  on production 2026-08-19.
- **End-to-end tests.** 26 Playwright specs across storefront, cart, checkout
  and admin, run against a separate Supabase project because they write real
  orders and move real stock. `NEXT_DIST_DIR` keeps the build out of the `.next`
  a dev server is using.
- **Admin guard costs no round trip.** `0015` adds a Postgres auth hook that
  signs `is_admin` into the JWT, so `requireAdmin()` reads a verified claim
  instead of querying `profiles`. Measured: `/admin` went from 1054-1358ms —
  for a page with no queries of its own — to double digits.
- **Orders filter and streaming.** All / Live / Pending / Cancelled with counts,
  in the URL so a view can be bookmarked; the list sits behind Suspense so the
  shell paints before the data arrives.
- **Cancel asks first, and shows it is working.** `cancelled` is terminal, so it
  is the one action that confirms. `useTransition` covers the write and the
  re-render it triggers, which together were ~1.2s of unchanged screen.
- **Sales history.** `0016` adds `sales_history` for the six months the studio
  traded before the shop existed (₹40,820), and `sales_by_month` unions it with
  the live figures. Deliberately not written as `orders` rows: that would have
  deducted stock for pieces long gone and invented line items nobody recorded.

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
- [x] **`0005` applied** — confirmed 2026-08-18, every product reads `INR`.
- [x] **Auth URL configuration** — done 2026-08-19. Site URL is the Vercel
      domain, with `https://art-speaks.vercel.app/**` and
      `http://localhost:3000/**` both on the redirect allow-list.

      Worth knowing, because it cost an afternoon: an unlisted `redirectTo` is
      not rejected, it is silently **discarded in favour of Site URL**. A local
      reset link arriving at the production domain looks like the app sending
      the wrong URL, and is not.
- [x] ~~Switch the signup email template~~ — superseded. Email confirmation is
      off, so no signup mail is sent at all. See the note under Deploy for when
      this comes back.

---

## Next

### 1. Deploy

**Done 2026-08-19** — live at `https://art-speaks.vercel.app`, functions in
`bom1` via `vercel.json`, all three environment variables set. What remains is
below.

#### Still outstanding after deploy

- [x] **Supabase auth URLs** — done 2026-08-19.
      Authentication → URL Configuration:
      Site URL `https://art-speaks.vercel.app`; redirect URLs
      `https://art-speaks.vercel.app/**` **and** `http://localhost:3000/**`
      (keep the second or local dev signup breaks).
- [x] **Email confirmation turned OFF** (decided 2026-08-19). Signup now signs
      people straight in.

      The reasoning, because it should be revisited rather than inherited:
      nothing in the app reads `email_confirmed_at`, and an account gates
      exactly one thing — the wishlist. Orders are guest checkout and never
      linked to an account, and the studio confirms over WhatsApp, so the app
      never emails a customer. Verification was protecting nothing while
      costing a flow that looked broken: the default template sends a PKCE
      `code` that only works in the browser that signed up, so signing up on a
      laptop and opening the email on a phone reads as "expired".

      **Turn it back on when accounts hold something worth protecting** — the
      user's planned order-history section is exactly that trigger. Do it
      alongside custom SMTP, not before: depending on email again while
      delivery is unreliable trades one broken flow for another. Note that by
      then there will be unverified accounts to reconcile.

      The signup form reads `data.session` from the response rather than
      assuming either behaviour, so switching it back needs no code change.

      If confirmation is ever re-enabled, also switch the template to the
      `token_hash` form so links survive being opened on another device:
      ```html
      <a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/">Confirm your email</a>
      ```
      `/auth/confirm` already handles both shapes, so this is an upgrade rather
      than a prerequisite. Note that template editing appeared to be locked in
      the dashboard as of 2026-08-19 — possibly gated behind custom SMTP, which
      would make the two one job.
- [ ] **Custom SMTP.** Supabase's built-in sender is a shared demo service,
      capped at a few messages an hour and frequently spam-filtered — their own
      docs say not to ship on it. The whole signup flow depends on that email
      arriving. Resend's free tier is far beyond this volume; verifying a sender
      needs DNS records on a domain you own (the user has one, unattached as of
      2026-08-19).
- [ ] **Point the domain at the site.** Not required for email — Resend needs
      DNS records, not the website — but doing it before the two SITE_URL
      settings above saves configuring them twice, and the CSP needs the final
      domain anyway.
- [ ] **Backups — run one.** `./supabase/backup.sh` is written; it needs
      `brew install libpq` and a `.env.backup` holding the connection string
      (both are documented at the top of the script). The free plan gives no
      automated backup worth relying on, and `sales_history` is six months of
      takings typed in from a notebook that exist nowhere else. Dumps land in
      `backups/`, which is gitignored — they contain customer names, addresses
      and phone numbers.
- [ ] **robots.txt and sitemap.xml** — both 404 today.
- [ ] **CSP** — the last of the security headers, deliberately deferred until
      the real domain exists (see the note in `next.config.ts`).

1. Import `AnushriKar99/art_speaks` on Vercel. Next.js is detected; defaults are
   fine.
2. **Set the function region to Mumbai (`bom1`).** Vercel defaults to Washington
   DC. Supabase is in `ap-south-1`, so leaving it means every query crosses the
   Atlantic — ~250-300ms per round trip, on top of the user's own latency. The
   move from Canada to Mumbai was made to fix exactly this; the wrong Vercel
   region reintroduces it at the other end.
3. Three environment variables, for Production, Preview and Development:
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
   `NEXT_PUBLIC_SITE_URL`. The last one is not optional — it feeds
   `metadataBase`, and without it Open Graph images resolve against
   `http://localhost:3000`, so every link pasted into WhatsApp or Instagram
   renders with no picture. For a studio that sells through pasted links, that
   is the shopfront window.
4. Redeploy so the build picks the variables up.
5. Auth URL configuration and the email template — both below.
6. Then the CSP, which needs the real domain to write.

Smoke test in this order, ending with the one flow never tested end to end:
homepage images (they come from Storage) → a search with a typo → cart,
checkout, and the order landing in `/admin/orders` → `/admin/sales` →
**customer signup and the emailed confirmation link**.

Nothing to do about the auth hook or the migrations: both are project-level and
already applied to the live project.

### 2. Content — My Journey and About Us
Copy and layout for `components/home/about-section.tsx` and `/about`. No
specifics agreed yet.

### 3. Admin dashboard design review
The `/admin` landing page is four cards linking onward. To be reviewed and
redesigned after using it — no defined change yet.

### 4. Payment
Deferred deliberately: orders are confirmed over WhatsApp and marked paid by
hand, which works and needs no integration. When it does land, **Razorpay** is
the better fit than Stripe — amounts are already in paise, and Stripe's India
support for domestic cards is awkward. `orders.payment_id` is provider-neutral
and waiting.

### 5. "Continue with Google" (scoped 2026-08-21, not started)

Worth knowing up front: **most of the architecture does not change.** Everything
downstream of "a session exists" is provider-agnostic —

- `proxy.ts` reads a JWT and does not care how it was obtained
- `requireAdmin()` reads the `is_admin` claim, unchanged
- the `0015` auth hook fires whenever a token is minted, Google or password
- every RLS policy uses `auth.uid()`, which is `auth.uid()` either way
- `handle_new_user()` is a trigger on `auth.users`, so a Google signup gets its
  `profiles` row automatically — no form code involved

#### What actually has to be built

1. **Google Cloud OAuth credentials.** Console → APIs & Services → Credentials
   → OAuth client ID (Web application). The authorised redirect URI is
   Supabase's, not ours:
   `https://udflrtaipqzbsfhtzuue.supabase.co/auth/v1/callback`
   Client ID and secret go into Supabase → Authentication → Providers → Google.
2. **A button** on `/login` and `/signup` calling
   `supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo } })`.
3. **`app/auth/callback/route.ts`.** OAuth does not return a session inline the
   way `signInWithPassword` does — Google redirects back with a `code` that has
   to be exchanged server-side.

   This is the only structural addition, and it is nearly free:
   `lib/auth/verify-email-link.ts` already exchanges a PKCE `code`, so the
   callback reuses it.

   **Put the destination in the PATH, not `?next=`.** Password reset was built
   the wrong way round first and silently landed people on the homepage:
   third-party redirect endpoints append their own query parameters and ours
   did not survive. `/auth/reset` exists because of that. Do the same here.

#### The decision it forces, which is not a technical one

Supabase's **"Link accounts with the same email"** setting decides what happens
when someone signs in with Google using an address that already has a password
account:

- **On** — one merged user. Convenient, but anyone controlling that Google
  account can then reach the password account.
- **Off** — two separate users sharing an email. Confusing in practice: their
  wishlist appears to vanish depending on which button they pressed.

Neither is obviously right. Linking is probably fine while an account holds
only a wishlist; revisit it when order history lands, because by then an
account holds addresses and purchase history.

Note this also weakens, slightly, the deliberate vagueness of the sign-in
error. Password sign-in fails identically for "no account" and "wrong password"
so nobody can probe which emails are registered; Google's flow is more
talkative about whether an account exists.

#### Is it worth doing

**Moderate.** It removes password friction and the forgotten-password path for
anyone who uses it — but signup is already frictionless since confirmation was
turned off, and password reset now works.

The real win is **email deliverability**: a Google user never needs a reset
email, which sidesteps the Supabase SMTP problem entirely for that group. That
argument gets weaker once custom SMTP is set up.

---

## Also outstanding

| Item | Notes |
| --- | --- |
| Add-to-cart animation | The item should visibly fly into the basket when added, rather than only the header count changing. Purely presentational — the cart itself works. |
| ~~Wishlist persistence~~ | **Done** — saves to the `wishlist` table, requires an account, RLS-enforced. Signed-out visitors get a sign-in prompt. |
| ~~Storefront search~~ | **Done** — substring match across name, description, artisan note, slug and category, with pg_trgm typo tolerance as a fallback. |
| Category images | 6 of 8 uploaded and linked. Still needed: **tote-bags, stickers** — these show a tinted "Coming soon" tile until then. Resize the long edge to 800px to match the rest, upload into `product-images/categories/`, then link that one row. Do **not** run `link_category_images.sql` while any are missing: it sets every null row, and the card checks whether the URL is set rather than whether it loads, so the remaining ones become broken images. |
| ~~Logo image~~ | **Done** — real logo, no Stitch hotlinks left anywhere. |
| ~~Custom order section image~~ | **Done** — a real studio flat-lay, served from `public/images/`. |
| Custom order form doesn't submit | Pre-fills a WhatsApp message; it cannot send. A Server Action would make it a real enquiry. |
| Sales test passes on a broken page | The test project has no `0016`, so `sales_by_month` is missing and `getSalesSummary` returns empty. The test accepts figures *or* "nothing sold yet" and cannot tell those apart from a failed query. Apply `0016` there **without** its `insert` block, and assert a known figure rather than either-or. The same blind spot means a missed migration on deploy would not error — the page would quietly claim nothing had sold. |
| `next.config.ts` still allowlists `lh3.googleusercontent.com` | Left over from the Stitch export. Verified 2026-08-18: all 8 products use uploaded images and none reference that host, so the pattern can be dropped. |

## Not doing (for now)

- Recording custom order enquiries (decided 2026-08-19). The form pre-fills a
  WhatsApp message and cannot send it — a browser cannot send WhatsApp on
  someone's behalf, that needs the Business Cloud API. A half-built version
  that stored the enquiry so an unsent one was not lost was started and
  stopped: the studio is happy that a request only counts once the person
  presses send.
- "What we believe" copy on /about (decided 2026-08-19). Placeholder text is
  staying for now.

- Category CRUD in the admin panel — the 8 categories cover the range and change
  once or twice a year; adding one is a single SQL statement. Note that a SQL
  edit takes up to an hour to appear, since categories are cached.
- Customer-facing order history (decided 2026-08-10). Ordering works without an
  account, so there is little to show most buyers. This also rules out
  customer-written reviews: place_whatsapp_order never sets customer_id, and the
  "can review own order" policy from 0001 requires it — so the review table
  stays unused and the homepage shows screenshots instead.
- Offline refunds and returns.
- **Reserving stock at order time** (decided 2026-08-20). Two customers can
  both order the last unit: availability is checked against raw `stock_count`,
  which is not touched until an order is marked paid, so both pass. The first
  confirmation deducts it; the second hits
  `greatest(stock_count - qty, 0)` in `decrement_stock_on_confirm`, which
  **clamps silently** — no error, no warning, both orders marked paid, and the
  shortage found while packing.

  Accepted because pieces can be remade: refusing the second order would lose
  a sale the studio would happily fulfil. Worth glancing at stock when
  something is down to its last one or two, since nothing flags it.

  **This stops being optional when a payment gateway lands.** The fix is to
  subtract what other pending orders already hold when computing availability
  (`available = stock_count - quantity in other pending, undeducted orders`) —
  no early deduction, only a change to what counts as available to a *new*
  order. But a gateway also makes a pending order an abandonable thing: a
  closed tab mid-payment would hold a unit forever, so reservations would need
  an expiry, which means this project's first scheduled job. Both together, not
  the reservation alone.
- Audit logging of admin changes — one admin, not yet worth it.
