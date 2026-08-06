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
-- ### supabase/migrations/0008_fuzzy_product_search.sql
-- ####################################################################

-- ============================================================
-- Typo-tolerant product search.
--
-- Substring search (ILIKE '%term%') only matches text that is literally
-- present, so "strawbery" finds nothing even though "Strawberry Pin" is
-- clearly what was meant. Shoppers mistype constantly, and a shop that
-- answers "no matches" to a near-miss looks empty rather than forgiving.
--
-- pg_trgm scores similarity by breaking strings into three-character chunks
-- and comparing overlap. "strawbery" and "strawberry" share nearly all their
-- trigrams, so they score highly; "winter" and "strawberry" share almost none.
--
-- This does NOT replace the ILIKE search in lib/data/products.ts. Substring
-- matching is better for the common case (typing "bow" should find every bow),
-- so the app tries that first and only falls back to this when it finds
-- nothing. Exact-ish matches stay exact; fuzziness is the safety net.
--
-- Idempotent: safe to run more than once.
-- ============================================================

create extension if not exists pg_trgm;

-- ---------- indexes ----------
-- GIN over trigrams, so similarity search doesn't scan every row once the
-- catalogue grows. One per column we search.
create index if not exists products_name_trgm_idx
  on public.products using gin (name gin_trgm_ops);

create index if not exists products_description_trgm_idx
  on public.products using gin (description gin_trgm_ops);

-- ---------- the search function ----------
-- SECURITY INVOKER (the default) so the products RLS still applies: an
-- inactive product stays invisible to the storefront through this path too.
--
-- Returns the same shape the app already maps, plus `score` so the caller can
-- order by relevance rather than name.
create or replace function public.search_products_fuzzy(
  search_term text,
  min_score   real default 0.15,
  max_results int  default 50
)
returns table (
  id             uuid,
  slug           text,
  name           text,
  description    text,
  artisan_note   text,
  price_cents    int,
  currency       text,
  stock_count    int,
  images         text[],
  is_best_seller boolean,
  is_new_arrival boolean,
  category_slug  text,
  score          real
)
language sql
stable
as $$
  select
    p.id, p.slug, p.name, p.description, p.artisan_note,
    p.price_cents, p.currency, p.stock_count, p.images,
    p.is_best_seller, p.is_new_arrival,
    c.slug as category_slug,
    -- Best match across the fields worth scoring. The name carries the most
    -- signal, so it is weighted above the longer prose fields, where a short
    -- search term is diluted by surrounding text.
    greatest(
      similarity(p.name, search_term),
      similarity(coalesce(c.name, ''), search_term),
      similarity(coalesce(p.description, ''),  search_term) * 0.5,
      similarity(coalesce(p.artisan_note, ''), search_term) * 0.5
    )::real as score
  from public.products p
  left join public.categories c on c.id = p.category_id
  where greatest(
          similarity(p.name, search_term),
          similarity(coalesce(c.name, ''), search_term),
          similarity(coalesce(p.description, ''),  search_term) * 0.5,
          similarity(coalesce(p.artisan_note, ''), search_term) * 0.5
        ) >= min_score
  order by score desc, p.name
  limit max_results;
$$;

-- ---------- try it ----------
--   select name, round(score::numeric, 3) from public.search_products_fuzzy('strawbery');
--   select name, round(score::numeric, 3) from public.search_products_fuzzy('bokmark');
--   select name, round(score::numeric, 3) from public.search_products_fuzzy('hart bow');


-- ####################################################################
-- ### supabase/migrations/0009_record_offline_sale.sql
-- ####################################################################

-- ============================================================
-- Recording an in-person sale.
--
-- Two things are missing before this can work.
--
-- 1. Nobody can insert an order. 0001 deliberately created no client INSERT
--    policy for orders or order_items, on the reasoning that orders would only
--    ever be created server-side after a payment confirmed. Offline sales break
--    that assumption: the admin *is* the point of sale.
--
-- 2. An order and its line items must be written together. Application code
--    doing two inserts can leave a sale with no items, or items with stock
--    already deducted against an order that failed. A function is one
--    transaction, so either the whole sale lands or none of it does.
--
-- SECURITY INVOKER (the default), so the policies below are what authorise
-- the write — the function is not a way around RLS.
--
-- Idempotent: safe to run more than once.
-- ============================================================

-- ---------- 1. let admins create orders ----------
drop policy if exists "admins create orders" on public.orders;
create policy "admins create orders"
  on public.orders for insert
  with check (public.is_admin());

drop policy if exists "admins create order items" on public.order_items;
create policy "admins create order items"
  on public.order_items for insert
  with check (public.is_admin());

-- ---------- 2. the sale, as one transaction ----------
-- items looks like:
--   [{"product_id": "uuid", "quantity": 2, "unit_price_cents": 5000}, ...]
--
-- Prices are passed in rather than read from the product, because a market
-- price is often not the shelf price — bundle deals, stall discounts, "take
-- both for ₹500". order_items stores a snapshot for exactly this reason.
create or replace function public.record_offline_sale(
  items   jsonb,
  sold_on date default current_date,
  note    text default null
)
returns uuid
language plpgsql
security invoker
as $$
declare
  new_order_id uuid;
  total_cents  int;
begin
  if items is null or jsonb_array_length(items) = 0 then
    raise exception 'A sale needs at least one item';
  end if;

  select coalesce(sum((i->>'quantity')::int * (i->>'unit_price_cents')::int), 0)
    into total_cents
    from jsonb_array_elements(items) i;

  insert into public.orders (
    channel, status, contact_email,
    subtotal_cents, shipping_cents, total_cents, currency,
    created_at
  )
  values (
    'offline', 'paid', null,
    total_cents, 0, total_cents, 'INR',
    -- Dated from the form, not now(): Saturday's market usually gets entered
    -- on Sunday, and the revenue chart should attribute it to Saturday.
    sold_on::timestamptz
  )
  returning id into new_order_id;

  -- Joining products both resolves the name snapshot and rejects any
  -- product_id that isn't real — a typo'd id silently vanishes rather than
  -- creating a line item pointing at nothing.
  insert into public.order_items (
    order_id, product_id, product_name, unit_price_cents, quantity
  )
  select
    new_order_id,
    p.id,
    p.name,
    (i->>'unit_price_cents')::int,
    (i->>'quantity')::int
  from jsonb_array_elements(items) i
  join public.products p on p.id = (i->>'product_id')::uuid
  where (i->>'quantity')::int > 0;

  if not exists (select 1 from public.order_items where order_id = new_order_id) then
    raise exception 'None of those products could be found';
  end if;

  return new_order_id;
end;
$$;

-- The order_items_decrement_stock trigger from 0006 fires inside this same
-- transaction, so stock and the sale can never disagree.

-- ---------- try it ----------
--   select public.record_offline_sale(
--     '[{"product_id":"<uuid>","quantity":2,"unit_price_cents":5000}]'::jsonb,
--     current_date
--   );


-- ####################################################################
-- ### supabase/migrations/0010_whatsapp_orders.sql
-- ####################################################################

-- ============================================================
-- WhatsApp orders, and moving stock deduction to confirmation.
--
-- Payment integration is deferred. In the meantime a customer builds a cart,
-- fills in their address, and the order is created here as `pending` while a
-- short WhatsApp message notifies the studio. The address travels through the
-- database rather than through message text, so nobody retypes a pincode.
--
-- Three things had to change for that to be safe.
--
--  1. `channel` allowed only 'online' and 'offline'.
--  2. The contact rule demanded an email. A WhatsApp customer gives a phone;
--     asking for an email as well is friction for no benefit.
--  3. Stock came off the moment line items were inserted. That is right for an
--     offline sale — it has already happened — but wrong for a WhatsApp order,
--     which is an intention. A customer who changes their mind would otherwise
--     leave your counts quietly wrong.
--
-- Stock now moves when an order is CONFIRMED, which is also the moment you
-- would physically set the pieces aside.
--
-- Idempotent: safe to run more than once.
-- ============================================================

-- ---------- 1. the third channel ----------
alter table public.orders drop constraint if exists orders_channel_check;
alter table public.orders
  add constraint orders_channel_check
  check (channel in ('online','offline','whatsapp'));

-- ---------- 2. reachable, not necessarily emailable ----------
-- An order you have to fulfil needs SOME way to contact the buyer. A walk-in
-- at a market needs neither, because they left with the item.
alter table public.orders drop constraint if exists orders_online_needs_email;
alter table public.orders
  add constraint orders_need_contact
  check (
    channel = 'offline'
    or contact_email is not null
    or contact_phone is not null
  );

-- ---------- 3. stock moves on confirmation ----------
-- Recorded on the order rather than inferred from status, so the deduction can
-- happen exactly once no matter how the status moves afterwards. Without this,
-- paid -> shipped -> paid would deduct twice.
alter table public.orders
  add column if not exists stock_deducted_at timestamptz;

-- An order created straight into 'paid' (an offline sale) still deducts as its
-- line items land — the sale already happened. A 'pending' order does not.
create or replace function public.decrement_stock()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  parent_status text;
  already       timestamptz;
begin
  if new.product_id is null then
    return new;
  end if;

  select status, stock_deducted_at
    into parent_status, already
    from public.orders
   where id = new.order_id;

  if parent_status in ('paid','shipped','delivered') and already is null then
    update public.products
       set stock_count = greatest(stock_count - new.quantity, 0)
     where id = new.product_id;
  end if;

  return new;
end;
$$;

-- Confirming a pending order is what reserves its stock.
create or replace function public.decrement_stock_on_confirm()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status in ('paid','shipped','delivered')
     and new.stock_deducted_at is null then

    -- Aggregated first: the same product can appear on more than one line, and
    -- a plain UPDATE ... FROM would apply only one of them.
    update public.products p
       set stock_count = greatest(p.stock_count - agg.qty, 0)
      from (
        select product_id, sum(quantity) as qty
          from public.order_items
         where order_id = new.id and product_id is not null
         group by product_id
      ) agg
     where p.id = agg.product_id;

    new.stock_deducted_at := now();
  end if;

  return new;
end;
$$;

drop trigger if exists orders_decrement_stock_on_confirm on public.orders;
create trigger orders_decrement_stock_on_confirm
  before update on public.orders
  for each row execute function public.decrement_stock_on_confirm();

-- ---------- 4. offline sales stamp themselves as deducted ----------
-- Their stock came off via the order_items trigger above, so the confirmation
-- trigger must not do it again. Setting the column in the same UPDATE means the
-- BEFORE trigger sees it already populated and skips.
create or replace function public.record_offline_sale(
  items   jsonb,
  sold_on date default current_date,
  note    text default null
)
returns uuid
language plpgsql
security invoker
as $$
declare
  new_order_id uuid;
  total_cents  int;
begin
  if items is null or jsonb_array_length(items) = 0 then
    raise exception 'A sale needs at least one item';
  end if;

  select coalesce(sum((i->>'quantity')::int * (i->>'unit_price_cents')::int), 0)
    into total_cents
    from jsonb_array_elements(items) i;

  insert into public.orders (
    channel, status, contact_email,
    subtotal_cents, shipping_cents, total_cents, currency,
    created_at
  )
  values (
    'offline', 'paid', null,
    total_cents, 0, total_cents, 'INR',
    sold_on::timestamptz
  )
  returning id into new_order_id;

  insert into public.order_items (
    order_id, product_id, product_name, unit_price_cents, quantity
  )
  select
    new_order_id, p.id, p.name,
    (i->>'unit_price_cents')::int,
    (i->>'quantity')::int
  from jsonb_array_elements(items) i
  join public.products p on p.id = (i->>'product_id')::uuid
  where (i->>'quantity')::int > 0;

  if not exists (select 1 from public.order_items where order_id = new_order_id) then
    raise exception 'None of those products could be found';
  end if;

  update public.orders
     set stock_deducted_at = now()
   where id = new_order_id;

  return new_order_id;
end;
$$;

-- ---------- 5. admins manage order items ----------
-- 0003 gave admins select on order_items but no update or delete, so a
-- mis-tapped line on a market sale could not be corrected.
drop policy if exists "admins update order items" on public.order_items;
create policy "admins update order items"
  on public.order_items for update
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "admins delete order items" on public.order_items;
create policy "admins delete order items"
  on public.order_items for delete
  using (public.is_admin());


-- ####################################################################
-- ### supabase/migrations/0011_place_whatsapp_order.sql
-- ####################################################################

-- ============================================================
-- Placing an order from the shop.
--
-- A customer is not logged in and is not an admin, so RLS blocks them from
-- writing an order. There were three ways round that, and only one is safe.
--
--   Opening an anonymous INSERT policy would let anyone POST straight to the
--   REST API and write whatever they liked — an order for zero rupees, or ten
--   thousand junk rows — bypassing the checkout form entirely.
--
--   A secret key used server-side works, but bypasses RLS wholesale, so safety
--   rests on application code remembering to validate.
--
--   This function is SECURITY DEFINER: it runs with its owner's privileges, so
--   it can insert past RLS, but the public can only CALL it. There is no way to
--   write an arbitrary row. RLS on orders stays shut.
--
-- The important property: THE BROWSER CANNOT SET A PRICE. There is no price
-- parameter. Prices are read from products inside the transaction, so ordering
-- eight bookmarks for one rupee is not a bug to be caught — it is unexpressible.
--
-- Stock is NOT deducted here. The order is 'pending' until the studio marks it
-- paid, and 0010's trigger deducts then. An unpaid order reserves nothing.
--
-- Idempotent: safe to run more than once.
-- ============================================================

-- Quantities are bounded by real stock, not an arbitrary ceiling: you cannot
-- order more of something than exists. max_lines separately bounds how much
-- work a single call can cause.
create or replace function public.place_whatsapp_order(
  items         jsonb,
  customer_name text,
  phone         text,
  address       jsonb default null,
  email         text default null
)
returns table (order_number bigint, total_cents int)
language plpgsql
security definer
set search_path = public
as $$
declare
  max_lines    constant int := 50;
  new_order_id uuid;
  computed     int;
  line_count   int;
  short_name   text;
  short_have   int;
  short_want   int;
begin
  -- ---------- shape ----------
  if items is null or jsonb_typeof(items) <> 'array' then
    raise exception 'No items in the order';
  end if;

  line_count := jsonb_array_length(items);
  if line_count = 0 then
    raise exception 'No items in the order';
  end if;
  if line_count > max_lines then
    raise exception 'Too many different items in one order';
  end if;

  -- ---------- contact ----------
  -- A phone number is required: it is how the studio replies. The orders table
  -- also enforces "email or phone" for any channel that has to be fulfilled.
  if customer_name is null or btrim(customer_name) = '' then
    raise exception 'Please give a name';
  end if;
  if phone is null or btrim(phone) = '' then
    raise exception 'Please give a phone number';
  end if;

  -- ---------- resolve the basket ----------
  -- Joined against products, so an id that does not exist, or a piece that is
  -- not listed or has nothing left, simply is not part of the order. The price
  -- is taken from the row, never from the caller.
  create temporary table if not exists _basket (
    product_id uuid,
    name text,
    unit_price_cents int,
    quantity int,
    stock_count int
  ) on commit drop;
  delete from _basket;

  insert into _basket (product_id, name, unit_price_cents, quantity, stock_count)
  select
    p.id,
    p.name,
    p.price_cents,
    greatest((i->>'quantity')::int, 1),
    p.stock_count
  from jsonb_array_elements(items) i
  join public.products p
    on p.id = (i->>'product_id')::uuid
   and p.is_active
   and p.stock_count > 0
  where (i->>'quantity')::int > 0;

  if not exists (select 1 from _basket) then
    raise exception 'None of those pieces are available';
  end if;

  -- ---------- nobody may order more than exists ----------
  -- Named rather than silently reduced: quietly shipping two when someone
  -- asked for five is a worse surprise than being told to adjust the basket.
  select name, stock_count, quantity
    into short_name, short_have, short_want
    from _basket
   where quantity > stock_count
   order by name
   limit 1;

  if short_name is not null then
    raise exception 'Only % of "%" left — you asked for %',
      short_have, short_name, short_want;
  end if;

  select sum(unit_price_cents * quantity) into computed from _basket;

  -- ---------- write it ----------
  insert into public.orders (
    channel, status,
    contact_email, contact_phone, shipping_address,
    subtotal_cents, shipping_cents, total_cents, currency
  )
  values (
    'whatsapp', 'pending',
    nullif(btrim(coalesce(email, '')), ''),
    btrim(phone),
    -- The name rides along in the address blob so it stays with the delivery
    -- details rather than being a column only this channel would ever use.
    coalesce(address, '{}'::jsonb) || jsonb_build_object('name', btrim(customer_name)),
    computed, 0, computed, 'INR'
  )
  returning id into new_order_id;

  insert into public.order_items (
    order_id, product_id, product_name, unit_price_cents, quantity
  )
  select new_order_id, product_id, name, unit_price_cents, quantity
  from _basket;

  return query
    select o.order_number, o.total_cents
    from public.orders o
    where o.id = new_order_id;
end;
$$;

-- Callable by shop visitors. This is the ONLY write into orders they can make.
grant execute on function public.place_whatsapp_order(jsonb, text, text, jsonb, text)
  to anon, authenticated;

-- ---------- try it ----------
--   select * from public.place_whatsapp_order(
--     '[{"product_id":"<uuid>","quantity":2}]'::jsonb,
--     'Test Person', '9123456789',
--     '{"line1":"1 Example Rd","city":"Kolkata","pincode":"700001"}'::jsonb
--   );


-- ####################################################################
-- ### supabase/migrations/0012_fix_place_whatsapp_order.sql
-- ####################################################################

-- ============================================================
-- Fix: place_whatsapp_order could never complete.
--
-- 0011 built the basket in a temporary table and reset it with an
-- unqualified `delete from _basket`. Supabase runs with safe-update mode
-- enabled, which rejects DELETE and UPDATE without a WHERE clause, so every
-- call failed with "DELETE requires a WHERE clause" — including the guard
-- paths, which meant even the validation errors were the wrong error.
--
-- Rewritten to resolve the basket into a jsonb value instead. No temporary
-- table, so nothing to reset and nothing for safe-update to object to.
--
-- Also fixes a hole the temp-table version had: the same product sent twice
-- produced two lines that each passed the stock check individually while
-- exceeding it together. Lines are now aggregated per product first.
--
-- Everything else is unchanged — still SECURITY DEFINER, still no price
-- parameter, still bounded by real stock, still leaves stock untouched until
-- the order is marked paid.
--
-- Idempotent: safe to run more than once.
-- ============================================================

create or replace function public.place_whatsapp_order(
  items         jsonb,
  customer_name text,
  phone         text,
  address       jsonb default null,
  email         text default null
)
returns table (order_number bigint, total_cents int)
language plpgsql
security definer
set search_path = public
as $$
declare
  max_lines    constant int := 50;
  basket       jsonb;
  new_order_id uuid;
  computed     int;
  short_name   text;
  short_have   int;
  short_want   int;
begin
  -- ---------- shape ----------
  if items is null or jsonb_typeof(items) <> 'array' then
    raise exception 'No items in the order';
  end if;
  if jsonb_array_length(items) = 0 then
    raise exception 'No items in the order';
  end if;
  if jsonb_array_length(items) > max_lines then
    raise exception 'Too many different items in one order';
  end if;

  -- ---------- contact ----------
  if customer_name is null or btrim(customer_name) = '' then
    raise exception 'Please give a name';
  end if;
  if phone is null or btrim(phone) = '' then
    raise exception 'Please give a phone number';
  end if;

  -- ---------- resolve the basket ----------
  -- Prices come from the products row, never from the caller — there is no
  -- price parameter to this function. A piece that does not exist, is not
  -- listed, or has nothing left simply is not part of the order.
  --
  -- Grouped by product, so sending the same id on two lines cannot slip past
  -- the stock check by splitting the quantity.
  select jsonb_agg(x)
    into basket
    from (
      select jsonb_build_object(
               'product_id',       p.id,
               'name',             p.name,
               'unit_price_cents', p.price_cents,
               'quantity',         sum(greatest((i->>'quantity')::int, 1)),
               'stock_count',      p.stock_count
             ) as x
        from jsonb_array_elements(items) i
        join public.products p
          on p.id = (i->>'product_id')::uuid
         and p.is_active
         and p.stock_count > 0
       where (i->>'quantity')::int > 0
       group by p.id, p.name, p.price_cents, p.stock_count
    ) grouped;

  if basket is null or jsonb_array_length(basket) = 0 then
    raise exception 'None of those pieces are available';
  end if;

  -- ---------- nobody may order more than exists ----------
  -- Refused by name rather than silently reduced: quietly shipping two when
  -- someone asked for five is the worse surprise.
  select b->>'name', (b->>'stock_count')::int, (b->>'quantity')::int
    into short_name, short_have, short_want
    from jsonb_array_elements(basket) b
   where (b->>'quantity')::int > (b->>'stock_count')::int
   order by b->>'name'
   limit 1;

  if short_name is not null then
    raise exception 'Only % of "%" left — you asked for %',
      short_have, short_name, short_want;
  end if;

  select sum((b->>'unit_price_cents')::int * (b->>'quantity')::int)
    into computed
    from jsonb_array_elements(basket) b;

  -- ---------- write it ----------
  insert into public.orders (
    channel, status,
    contact_email, contact_phone, shipping_address,
    subtotal_cents, shipping_cents, total_cents, currency
  )
  values (
    'whatsapp', 'pending',
    nullif(btrim(coalesce(email, '')), ''),
    btrim(phone),
    coalesce(address, '{}'::jsonb) || jsonb_build_object('name', btrim(customer_name)),
    computed, 0, computed, 'INR'
  )
  returning id into new_order_id;

  insert into public.order_items (
    order_id, product_id, product_name, unit_price_cents, quantity
  )
  select
    new_order_id,
    (b->>'product_id')::uuid,
    b->>'name',
    (b->>'unit_price_cents')::int,
    (b->>'quantity')::int
  from jsonb_array_elements(basket) b;

  return query
    select o.order_number, o.total_cents
    from public.orders o
    where o.id = new_order_id;
end;
$$;

grant execute on function public.place_whatsapp_order(jsonb, text, text, jsonb, text)
  to anon, authenticated;


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
