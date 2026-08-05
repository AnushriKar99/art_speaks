-- ============================================================================
--  Art Speaks — complete database setup, in one paste.
--
--  Use this when standing up a fresh Supabase project (e.g. moving region).
--  Paste the whole file into the SQL editor and run once. It is every
--  migration 0001–0007 followed by the category and product seeds, in the
--  order they must run.
--
--  Safe to re-run: every statement is idempotent, and the seeds use
--  `on conflict` so they update rather than duplicate.
--
--  This file is GENERATED. Do not edit it by hand — change the migration or
--  seed it came from and regenerate, or the two will drift apart.
--
--  AFTER running this, four things still need doing by hand:
--    1. Auth → Users → Add user (auto-confirm), then:
--         update public.profiles set is_admin = true
--         where id = (select id from auth.users where email = 'YOUR@EMAIL');
--    2. Storage → New bucket named exactly `product-images`, marked Public.
--       Then run the storage policies at the very bottom of this file.
--    3. Auth → URL Configuration: set Site URL, and allow-list
--       <site>/auth/confirm as a redirect URL.
--    4. Auth → Email Templates → Confirm signup, replace the link with:
--         {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/
--       (the default template's PKCE code only works in the browser that
--        signed up, so cross-device confirmation fails without this)
-- ============================================================================





-- ####################################################################
-- ### supabase/migrations/0001_initial_schema.sql
-- ####################################################################

-- ============================================================
-- Art Speaks — initial schema
-- Paste into the Supabase SQL editor, or run via the Supabase CLI.
--
-- 7 tables: categories, products, profiles, orders, order_items,
-- reviews, wishlist. Guest checkout supported (orders.customer_id
-- is nullable). Best-seller / new-arrival are computed in the app,
-- not stored. RLS is enabled on every table.
-- ============================================================

-- ---------- helpers ----------

-- Keeps updated_at fresh on UPDATE.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Human-friendly order numbers (1001, 1002, ...), separate from the uuid PK.
create sequence if not exists public.order_number_seq start 1001;

-- ============================================================
-- categories
-- ============================================================
create table public.categories (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  name        text not null,
  accent_color text,
  image_url   text,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now()
);

-- ============================================================
-- products  (inventory + storefront listing in one table)
-- is_best_seller / is_new_arrival are editorial flags the shop sets by hand
-- (which pieces to feature in the homepage carousels).
-- ============================================================
create table public.products (
  id             uuid primary key default gen_random_uuid(),
  slug           text not null unique,
  name           text not null,
  description    text,
  artisan_note   text,
  price_cents    int not null check (price_cents >= 0),
  currency       text not null default 'USD',
  stock_count    int not null default 0 check (stock_count >= 0),
  category_id    uuid references public.categories(id) on delete set null,
  images         text[] not null default '{}',
  is_active      boolean not null default true,
  is_best_seller boolean not null default false,
  is_new_arrival boolean not null default false,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index products_category_id_idx on public.products (category_id);
create index products_is_active_idx  on public.products (is_active);
create index products_created_at_idx on public.products (created_at desc); -- new arrivals

create trigger products_set_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

-- ============================================================
-- profiles  (1:1 with auth.users — account holders only)
-- ============================================================
create table public.profiles (
  id               uuid primary key references auth.users(id) on delete cascade,
  full_name        text,
  phone            text,
  shipping_address jsonb,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Auto-create a profile row whenever a new auth user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- orders  (guest checkout: customer_id nullable, contact stored on the order)
-- ============================================================
create table public.orders (
  id             uuid primary key default gen_random_uuid(),
  order_number   bigint not null unique default nextval('public.order_number_seq'),
  customer_id    uuid references public.profiles(id) on delete set null,
  contact_email  text not null,
  contact_phone  text,
  shipping_address jsonb,
  status         text not null default 'pending'
                   check (status in ('pending','paid','shipped','delivered','cancelled')),
  subtotal_cents int not null default 0,
  shipping_cents int not null default 0,
  total_cents    int not null default 0,
  currency       text not null default 'USD',
  payment_id     text,   -- provider-neutral: Razorpay payment id, UPI ref, etc. (payment deferred for now)
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index orders_customer_id_idx on public.orders (customer_id);
create index orders_status_idx      on public.orders (status);
create index orders_created_at_idx  on public.orders (created_at desc);

create trigger orders_set_updated_at
  before update on public.orders
  for each row execute function public.set_updated_at();

-- ============================================================
-- order_items  (line items; snapshot name + price at purchase time)
-- product_id kept nullable so an order survives a product being deleted.
-- ============================================================
create table public.order_items (
  id              uuid primary key default gen_random_uuid(),
  order_id        uuid not null references public.orders(id) on delete cascade,
  product_id      uuid references public.products(id) on delete set null,
  product_name    text not null,               -- snapshot
  unit_price_cents int not null,               -- snapshot
  quantity        int not null check (quantity > 0),
  created_at      timestamptz not null default now()
);

create index order_items_order_id_idx   on public.order_items (order_id);
create index order_items_product_id_idx on public.order_items (product_id); -- best-seller aggregation

-- ============================================================
-- reviews  (per-order, not per-item; one review per order)
-- ============================================================
create table public.reviews (
  id          uuid primary key default gen_random_uuid(),
  customer_id uuid references public.profiles(id) on delete set null,
  order_id    uuid not null unique references public.orders(id) on delete cascade,
  author_name text not null,
  rating      int not null check (rating between 1 and 5),
  body        text,
  image_url   text,
  created_at  timestamptz not null default now()
);

create index reviews_customer_id_idx on public.reviews (customer_id);

-- ============================================================
-- wishlist  (per account holder; one row per product)
-- ============================================================
create table public.wishlist (
  id          uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles(id) on delete cascade,
  product_id  uuid not null references public.products(id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique (customer_id, product_id)
);

create index wishlist_customer_id_idx on public.wishlist (customer_id);

-- ============================================================
-- Row-Level Security
-- Note: the service role (used from trusted server code) bypasses RLS.
-- Order + order_item creation is expected to happen server-side after
-- payment is confirmed, so there are intentionally no client insert policies
-- for those tables here.
-- ============================================================

alter table public.categories  enable row level security;
alter table public.products    enable row level security;
alter table public.profiles    enable row level security;
alter table public.orders      enable row level security;
alter table public.order_items enable row level security;
alter table public.reviews     enable row level security;
alter table public.wishlist    enable row level security;

-- categories: anyone can read.
create policy "categories are public"
  on public.categories for select
  using (true);

-- products: anyone can read active products.
create policy "active products are public"
  on public.products for select
  using (is_active);

-- profiles: a user can see and edit only their own.
create policy "own profile is readable"
  on public.profiles for select
  using (auth.uid() = id);
create policy "own profile is updatable"
  on public.profiles for update
  using (auth.uid() = id);

-- orders: a logged-in customer can read only their own orders.
-- (Guests receive an emailed confirmation rather than reading via RLS.)
create policy "own orders are readable"
  on public.orders for select
  using (auth.uid() = customer_id);

-- order_items: readable when the parent order belongs to the user.
create policy "own order items are readable"
  on public.order_items for select
  using (exists (
    select 1 from public.orders o
    where o.id = order_items.order_id and o.customer_id = auth.uid()
  ));

-- reviews: anyone can read; a logged-in user may add a review for their own order.
create policy "reviews are public"
  on public.reviews for select
  using (true);
create policy "can review own order"
  on public.reviews for insert
  with check (
    auth.uid() = customer_id
    and exists (
      select 1 from public.orders o
      where o.id = reviews.order_id and o.customer_id = auth.uid()
    )
  );

-- wishlist: a user fully manages only their own rows.
create policy "own wishlist is readable"
  on public.wishlist for select
  using (auth.uid() = customer_id);
create policy "can add to own wishlist"
  on public.wishlist for insert
  with check (auth.uid() = customer_id);
create policy "can remove from own wishlist"
  on public.wishlist for delete
  using (auth.uid() = customer_id);


-- ####################################################################
-- ### supabase/migrations/0002_add_product_flags.sql
-- ####################################################################

-- ============================================================
-- Add editorial product flags: is_best_seller, is_new_arrival.
--
-- Run this against a database that was created with the ORIGINAL
-- 0001 (before these columns existed). Idempotent (IF NOT EXISTS),
-- so it's a no-op if 0001 already includes them.
-- ============================================================

alter table public.products
  add column if not exists is_best_seller boolean not null default false;

alter table public.products
  add column if not exists is_new_arrival boolean not null default false;


-- ####################################################################
-- ### supabase/migrations/0003_admin_role.sql
-- ####################################################################

-- ============================================================
-- Admin role + admin RLS policies.
--
-- Adds an is_admin flag to profiles and lets an admin manage the
-- store's data (products, categories, orders, order_items, reviews).
-- Public read + per-user policies from 0001 stay as-is; these are
-- ADDITIONAL policies (RLS combines policies with OR, so granting
-- admins more never takes anything away from existing rules).
--
-- Idempotent: safe to run more than once.
-- ============================================================

-- ---------- 1. the flag ----------
alter table public.profiles
  add column if not exists is_admin boolean not null default false;

-- ---------- 2. the check ----------
-- SECURITY DEFINER so it can read profiles regardless of the caller's RLS,
-- which also avoids any policy-recursion when it's used inside policies.
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and is_admin = true
  );
$$;

-- ---------- 3. admin policies ----------
-- products: full control.
drop policy if exists "admins manage products" on public.products;
create policy "admins manage products"
  on public.products for all
  using (public.is_admin())
  with check (public.is_admin());

-- categories: full control.
drop policy if exists "admins manage categories" on public.categories;
create policy "admins manage categories"
  on public.categories for all
  using (public.is_admin())
  with check (public.is_admin());

-- orders: read every order, and update (e.g. mark shipped).
drop policy if exists "admins read orders" on public.orders;
create policy "admins read orders"
  on public.orders for select
  using (public.is_admin());

drop policy if exists "admins update orders" on public.orders;
create policy "admins update orders"
  on public.orders for update
  using (public.is_admin())
  with check (public.is_admin());

-- order_items: read every line item.
drop policy if exists "admins read order items" on public.order_items;
create policy "admins read order items"
  on public.order_items for select
  using (public.is_admin());

-- reviews: read all + delete (moderate). Public read already exists from 0001.
drop policy if exists "admins delete reviews" on public.reviews;
create policy "admins delete reviews"
  on public.reviews for delete
  using (public.is_admin());


-- ####################################################################
-- ### supabase/migrations/0004_lock_admin_flag.sql
-- ####################################################################

-- ============================================================
-- Lock the is_admin flag against self-assignment.
--
-- 0003 added profiles.is_admin. 0001 already grants every user UPDATE on
-- their own profile row ("own profile is updatable", USING auth.uid() = id).
-- RLS gates ROWS, not COLUMNS — and Supabase grants `authenticated` UPDATE
-- on all columns by default. So before this migration any logged-in user
-- could simply:
--
--   PATCH /rest/v1/profiles?id=eq.<their own id>   {"is_admin": true}
--
-- ...and become an admin. With public signup enabled that means anyone.
--
-- Postgres has no column-level RLS, so the fix is column-level GRANTs.
-- A table-level UPDATE grant implies every column, so the broad grant must
-- be revoked FIRST and then re-issued for the columns a user may legitimately
-- edit. is_admin is left out, so it becomes writable only by the service role
-- and by the admin policies from 0003.
--
-- Idempotent: revoke/grant are declarative, safe to run more than once.
-- ============================================================

-- ---------- authenticated ----------
revoke update on public.profiles from authenticated;

grant update (full_name, phone, shipping_address)
  on public.profiles to authenticated;

-- ---------- anon ----------
-- RLS already blocks anon (auth.uid() is null, so no row matches), but revoking
-- the grant means a future policy change can't silently open this back up.
revoke update on public.profiles from anon;


-- ####################################################################
-- ### supabase/migrations/0005_currency_inr.sql
-- ####################################################################

-- ============================================================
-- Switch the store's currency from USD to INR.
--
-- The schema was scaffolded with a 'USD' default from the Stitch export,
-- but the studio sells mainly in India. price_cents / *_cents columns keep
-- the same integer convention — they now mean paise (₹12.50 = 1250).
--
-- Run this BEFORE entering real inventory. Afterwards it means editing
-- every product by hand.
--
-- Idempotent: the updates are scoped to rows still marked 'USD'.
-- ============================================================

-- ---------- defaults for new rows ----------
alter table public.products alter column currency set default 'INR';
alter table public.orders   alter column currency set default 'INR';

-- ---------- existing rows ----------
-- Only rewrites the label. There are no real orders yet and products is
-- empty (categories-only seed), so no amounts need converting. If this ever
-- runs against a database holding genuine USD amounts, convert the *_cents
-- values first — this statement will not do it for you.
update public.products set currency = 'INR' where currency = 'USD';
update public.orders   set currency = 'INR' where currency = 'USD';


-- ####################################################################
-- ### supabase/migrations/0006_sales_schema.sql
-- ####################################################################

-- ============================================================
-- Offline sales, automatic stock deduction, and reporting views.
--
-- An offline (in-person) sale is the same event as an online one: stock
-- leaves, money arrives, on a date. Only the provenance differs — and
-- provenance is a column, not a table. So an offline sale is just an
-- orders row with channel = 'offline', and its line items are ordinary
-- order_items rows.
--
-- The payoff is that stock deduction, the revenue chart and the
-- best-seller ranking are each written ONCE and cover both channels.
--
-- Idempotent: safe to run more than once.
-- ============================================================

-- ---------- 1. the channel ----------
alter table public.orders
  add column if not exists channel text not null default 'online';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'orders_channel_check'
  ) then
    alter table public.orders
      add constraint orders_channel_check
      check (channel in ('online','offline'));
  end if;
end $$;

create index if not exists orders_channel_idx on public.orders (channel);

-- Walk-in buyers don't hand over an email address, so contact_email can no
-- longer be NOT NULL. The check below keeps the requirement for online
-- orders, so checkout can't silently create orders with nobody to email.
alter table public.orders alter column contact_email drop not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'orders_online_needs_email'
  ) then
    alter table public.orders
      add constraint orders_online_needs_email
      check (channel = 'offline' or contact_email is not null);
  end if;
end $$;

-- ---------- 2. stock deduction ----------
-- Done in the database, not in application code: a trigger makes the line
-- item and the stock change one transaction, so they cannot disagree if a
-- request dies halfway through.
--
-- greatest(...,0) matters. products.stock_count has a check (>= 0)
-- constraint, so without the clamp, selling 3 of something the system
-- thinks you have 2 of would throw and the whole sale would fail to
-- record. Counts drift in real life (you made extras, you gifted one) and
-- a database refusing to record a sale that physically happened is the
-- wrong behaviour. Clamp, record, and let the low_stock view surface the
-- discrepancy.
create or replace function public.decrement_stock()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.product_id is not null then
    update public.products
       set stock_count = greatest(stock_count - new.quantity, 0)
     where id = new.product_id;
  end if;
  return new;
end;
$$;

drop trigger if exists order_items_decrement_stock on public.order_items;
create trigger order_items_decrement_stock
  after insert on public.order_items
  for each row execute function public.decrement_stock();

-- ---------- 3. reporting views ----------
-- Aggregate in Postgres, not in the browser.
--
-- The status filter is load-bearing: "sales" must mean money actually
-- taken, or the chart counts abandoned carts as revenue. Offline sales are
-- written straight to 'paid', so they're included automatically.
--
-- security_invoker makes the view run with the caller's permissions, so
-- the admin RLS policies from 0003 apply rather than the view owner's.
create or replace view public.monthly_sales
with (security_invoker = true) as
  select date_trunc('month', created_at) as month,
         channel,
         count(*)          as order_count,
         sum(total_cents)  as revenue_cents
  from public.orders
  where status in ('paid','shipped','delivered')
  group by 1, 2;

create or replace view public.low_stock
with (security_invoker = true) as
  select id, name, stock_count, price_cents
  from public.products
  where is_active and stock_count <= 3
  order by stock_count, name;


-- ####################################################################
-- ### supabase/migrations/0007_products_in_rupees_view.sql
-- ####################################################################

-- ============================================================
-- A rupee-facing view of products, for reading in the Supabase dashboard.
--
-- price_cents stores paise, because that is the unit payment gateways expect
-- and integers keep money free of floating-point rounding. The trade-off is
-- that the dashboard's Table Editor shows a ₹50 pin as 5000, since it reads
-- the database directly and never runs formatPrice().
--
-- This view does that division once, so the Table Editor sidebar has an entry
-- that reads in rupees. It is a saved query, not a copy — the numbers can
-- never drift from the products table.
--
-- READ ONLY in practice: writing to it would need an INSTEAD OF trigger, which
-- is deliberately not added. Insert and update through `products`, where the
-- unit is unambiguous. The seed files already take rupees and convert on the
-- way in.
--
-- security_invoker = true runs the view as whoever queries it, so the RLS on
-- products still applies. Without it a view can quietly become a way around
-- your own access rules.
--
-- Idempotent: safe to run more than once.
-- ============================================================

drop view if exists public.products_in_rupees;

create view public.products_in_rupees
with (security_invoker = true) as
  select
    p.id,
    p.name,
    p.slug,
    -- Numeric, not integer division, so a ₹49.50 piece shows as 49.50 rather
    -- than being silently truncated to 49.
    round(p.price_cents / 100.0, 2) as price_rupees,
    p.stock_count,
    c.name        as category,
    p.is_active,
    p.is_best_seller,
    p.is_new_arrival,
    cardinality(p.images) as image_count,   -- 0 = still shows the 🥺 placeholder
    p.created_at,
    p.updated_at
  from public.products p
  left join public.categories c on c.id = p.category_id
  order by p.name;

comment on view public.products_in_rupees is
  'Read-only rupee view of products for the dashboard. Edit products directly; price_cents there is in paise.';


-- ####################################################################
-- ### supabase/seed_categories.sql
-- ####################################################################

-- ============================================================
-- Art Speaks — category rows (real data).
-- Images intentionally omitted (image_url stays null) — add later via the
-- Table Editor or:  update public.categories set image_url = '...' where slug = '...';
-- Re-runnable: on conflict (slug) do nothing.
-- ============================================================

insert into public.categories (slug, name, accent_color, sort_order) values
  ('phone-charms',           'Phone Charms',           '#FFB7CE', 1),
  ('keychains-worry-stones', 'Keychains/Worry Stones', '#E0BBE4', 2),
  ('bookmarks',              'Bookmarks',              '#98FFD9', 3),
  ('paintings',              'Paintings',              '#FDFFAB', 4),
  ('bag-charms',             'Bag Charms',             '#FFD3B0', 5),
  ('fridge-magnets',         'Fridge Magnets',         '#AEE2FF', 6),
  ('tote-bags',              'Tote Bags',              '#C7CEEA', 7),
  ('stickers',               'Stickers',               '#FFAAA7', 8)
on conflict (slug) do nothing;


-- ####################################################################
-- ### supabase/seed_products_bookmarks.sql
-- ####################################################################

-- ============================================================
-- Art Speaks — pin bookmark range (first real inventory)
--
-- Safe to re-run: `on conflict (slug) do update` refreshes an existing row
-- rather than erroring or duplicating. Edit a price here, paste again, done.
--
-- Does NOT touch categories, orders or anything else — unlike seed.sql, which
-- truncates half the database and should not be run against live data.
--
-- Photos are deliberately empty ('{}'). The storefront shows a 🥺 placeholder
-- for products without one, so listings can go up before the shoot. Add them
-- later with:
--   update public.products
--      set images = array['https://…/storage/v1/object/public/product-images/heart-bow-pin.jpg']
--    where slug = 'heart-bow-pin';
--
-- WRITE PRICES IN RUPEES. ₹50 is just 50 below — the insert multiplies by 100
-- on its way into price_cents, which stores paise because that is what payment
-- gateways expect. You never have to do that arithmetic yourself.
-- ============================================================

with copy as (
  select
    'Say goodbye to lost pages! These pin bookmarks feature adorable handmade clay charms on a paper pin, so they''re easy to find and even easier to pop in and out of your book. Cute, functional, and made to bring a smile every time you open your book.'::text
      as description,
    'Made entirely by hand, right down to the backcard, so each piece has its own little variations.'::text
      as artisan_note
),
cat as (
  select id from public.categories where slug = 'bookmarks'
),
--                                                              ₹ rupees   stock
items (slug, name, price_rupees, stock_count) as (
  values
    ('heart-bow-pin',              'Heart Bow Pin',               50::int,  2::int),
    ('bow-pin-1',                  'Bow Pin (1)',                 50,       2),
    ('bow-pin-2',                  'Bow Pin (2)',                 50,       2),
    ('strawberry-pin',             'Strawberry Pin',              70,       6),
    ('frog-pin',                   'Frog Pin',                    70,       2),
    -- "Starry Night" was listed twice (stock 2 and stock 1). Treated as one
    -- product with stock 3 — two identical names would show as duplicate
    -- listings in the shop. If they are genuinely different pieces, split this
    -- into 'starry-night-1' / 'starry-night-2' with distinct names.
    ('starry-night',               'Starry Night',               120,       3),
    ('winter',                     'Winter',                     120,       1),
    ('wheat-field-with-cypresses', 'Wheat Field with Cypresses', 120,       1)
)
insert into public.products
  (slug, name, description, artisan_note, price_cents, currency,
   stock_count, category_id, images, is_active, is_best_seller, is_new_arrival)
select
  i.slug, i.name, c.description, c.artisan_note,
  i.price_rupees * 100,          -- rupees → paise, so you never type paise
  'INR',
  i.stock_count, cat.id, '{}', true, true, true
from items i, copy c, cat
on conflict (slug) do update set
  name           = excluded.name,
  description    = excluded.description,
  artisan_note   = excluded.artisan_note,
  price_cents    = excluded.price_cents,
  currency       = excluded.currency,
  stock_count    = excluded.stock_count,
  category_id    = excluded.category_id,
  is_active      = excluded.is_active,
  is_best_seller = excluded.is_best_seller,
  is_new_arrival = excluded.is_new_arrival;
  -- images is deliberately NOT overwritten, so re-running this file never
  -- wipes photos you have already uploaded.

-- Check what landed, shown back in rupees:
--   select name, price_cents / 100 as rupees, stock_count
--   from public.products order by name;

-- ####################################################################
-- ### Storage policies — run AFTER creating the `product-images` bucket
-- ####################################################################

-- Product photos are meant to be seen, so public read. Writes are gated on
-- the is_admin() helper from 0003, so only a flagged admin can upload.
drop policy if exists "product images are public" on storage.objects;
create policy "product images are public"
  on storage.objects for select
  using (bucket_id = 'product-images');

drop policy if exists "admins manage product images" on storage.objects;
create policy "admins manage product images"
  on storage.objects for all
  using (bucket_id = 'product-images' and public.is_admin())
  with check (bucket_id = 'product-images' and public.is_admin());


-- ####################################################################
-- ### Check it worked
-- ####################################################################
-- Expect 8 categories, 8 products, prices 50 / 70 / 120.
--   select (select count(*) from public.categories) as categories,
--          (select count(*) from public.products)   as products;
--   select name, price_rupees, stock_count from public.products_in_rupees;
