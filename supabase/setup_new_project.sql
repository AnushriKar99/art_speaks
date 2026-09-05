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
--  AFTER running this, three things still need doing by hand:
--    1. Auth → Users → Add user (auto-confirm), then:
--         update public.profiles set is_admin = true
--         where id = (select id from auth.users where email = 'YOUR@EMAIL');
--    2. Auth → URL Configuration: set Site URL, and allow-list
--       <site>/auth/confirm as a redirect URL.
--    3. Auth → Email Templates → Confirm signup, replace the link with:
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
-- ### supabase/migrations/0013_storage_policies.sql
-- ####################################################################

-- ============================================================
-- The product-images bucket, and the policies protecting it.
--
-- These existed only in setup_footer.sql.in, which feeds the generated
-- setup_new_project.sql — so a project rebuilt from migrations/ alone got a
-- PUBLIC BUCKET WITH NO WRITE POLICY. Raised in review on PR #1.
--
-- That matters more here than it would elsewhere. lib/images/upload.ts calls
-- Supabase Storage straight from the browser with the visitor's own session:
-- it never passes through a Server Action, so requireAdmin() is never
-- consulted, and the middleware only decides which pages render — not which
-- Storage endpoints a token may call.
--
-- RLS on storage.objects is therefore the ONLY thing standing between a
-- signed-up customer and write access to the bucket. It belongs in the schema
-- history, not in a generated file.
--
-- Idempotent: safe to run more than once.
-- ============================================================

-- ---------- the bucket ----------
-- Created here rather than by hand in the dashboard, so a project can be
-- rebuilt from migrations without a manual step that is easy to forget.
-- Public read: product photos are meant to be seen, and signed URLs would add
-- expiry handling for no benefit while breaking next/image caching.
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do update set public = true;

-- ---------- read ----------
drop policy if exists "product images are public" on storage.objects;
create policy "product images are public"
  on storage.objects for select
  using (bucket_id = 'product-images');

-- ---------- write ----------
-- Gated on the same is_admin() helper the table policies use, so there is one
-- definition of "is an admin" rather than two that can drift.
drop policy if exists "admins manage product images" on storage.objects;
create policy "admins manage product images"
  on storage.objects for all
  using (bucket_id = 'product-images' and public.is_admin())
  with check (bucket_id = 'product-images' and public.is_admin());

-- ---------- check ----------
--   select policyname, cmd from pg_policies
--   where schemaname = 'storage' and tablename = 'objects';
-- Two rows. None means the bucket is open to any authenticated caller.


-- ####################################################################
-- ### supabase/migrations/0014_order_stock_consistency.sql
-- ####################################################################

-- ============================================================
-- Two order/stock consistency fixes raised in review on PR #1.
--
-- 1. place_whatsapp_order silently drops lines
--
--    It joins on `p.is_active and p.stock_count > 0` and omits anything that
--    fails, but returned only the order number and total. The checkout page
--    fetched products with no such filter, so whenever a piece sold out or was
--    deactivated between add-to-cart and checkout the customer saw a three-way
--    mismatch: the summary listed the item, the total excluded it, and the
--    WhatsApp message told the studio to send it.
--
--    The function now returns the basket it actually wrote, so the confirmation
--    and the message can be rendered from what was recorded rather than from
--    what the browser hoped.
--
-- 2. Stock deduction was a one-way latch
--
--    stock_deducted_at correctly prevented double deduction, but nothing ever
--    restored units. Every mistaken "paid" click and every post-confirmation
--    cancellation permanently lowered the count, and because the order function
--    refuses lines with stock_count = 0, pieces physically sitting in the studio
--    would eventually become unorderable with no way back.
--
--    Leaving paid/shipped/delivered now restores what was taken.
--
-- Idempotent: safe to run more than once.
-- ============================================================

-- ---------- 1. return the resolved basket ----------
-- The return type changes, so the old signature has to go first.
drop function if exists public.place_whatsapp_order(jsonb, text, text, jsonb, text);

create function public.place_whatsapp_order(
  items         jsonb,
  customer_name text,
  phone         text,
  address       jsonb default null,
  email         text default null
)
returns table (order_number bigint, total_cents int, lines jsonb)
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
  if items is null or jsonb_typeof(items) <> 'array' then
    raise exception 'No items in the order';
  end if;
  if jsonb_array_length(items) = 0 then
    raise exception 'No items in the order';
  end if;
  if jsonb_array_length(items) > max_lines then
    raise exception 'Too many different items in one order';
  end if;

  if customer_name is null or btrim(customer_name) = '' then
    raise exception 'Please give a name';
  end if;
  if phone is null or btrim(phone) = '' then
    raise exception 'Please give a phone number';
  end if;

  -- Prices come from the products row; there is no price parameter, so a
  -- browser cannot set what something costs. Grouped by product, so sending
  -- the same id twice cannot slip past the stock check by splitting quantity.
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
    select o.order_number, o.total_cents,
           -- Only what was written. stock_count is dropped: it is an internal
           -- detail of the availability check, not something a customer needs.
           (select jsonb_agg(jsonb_build_object(
                     'name', b->>'name',
                     'quantity', (b->>'quantity')::int,
                     'unit_price_cents', (b->>'unit_price_cents')::int))
              from jsonb_array_elements(basket) b)
    from public.orders o
    where o.id = new_order_id;
end;
$$;

grant execute on function public.place_whatsapp_order(jsonb, text, text, jsonb, text)
  to anon, authenticated;

-- ---------- 2. give the latch a way back ----------
create or replace function public.decrement_stock_on_confirm()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  was_counted boolean := old.status in ('paid','shipped','delivered');
  is_counted  boolean := new.status in ('paid','shipped','delivered');
begin
  -- Becoming a sale: take the stock, once.
  if is_counted and new.stock_deducted_at is null then
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

  -- Ceasing to be a sale: give it back, and clear the stamp so a later
  -- re-confirmation deducts again rather than silently doing nothing.
  elsif was_counted and not is_counted and old.stock_deducted_at is not null then
    update public.products p
       set stock_count = p.stock_count + agg.qty
      from (
        select product_id, sum(quantity) as qty
          from public.order_items
         where order_id = new.id and product_id is not null
         group by product_id
      ) agg
     where p.id = agg.product_id;

    new.stock_deducted_at := null;
  end if;

  return new;
end;
$$;

-- ---------- try it ----------
--   update public.orders set status = 'paid'      where order_number = 1004;  -- deducts
--   update public.orders set status = 'cancelled' where order_number = 1004;  -- restores


-- ####################################################################
-- ### supabase/migrations/0015_admin_claim_in_jwt.sql
-- ####################################################################

-- ============================================================
-- Put is_admin into the access token, so the guard costs no round trip.
--
-- Every admin page calls requireAdmin(), which read profiles.is_admin from the
-- database on each request. Measured against this project that is ~600ms — and
-- it sits in front of the render, so nothing paints until it returns. On a slow
-- link the studio felt sluggish for a boolean that changes once a year.
--
-- Supabase can run a function while it mints an access token (an "auth hook"),
-- and whatever that function adds to `claims` is signed into the JWT. The app
-- already verifies tokens locally against the project's JWKS, so reading a
-- claim is pure arithmetic — no network at all.
--
-- WHAT THIS DOES NOT DO
--
-- It does not move the security boundary. RLS still decides every read and
-- write, and RLS reads profiles directly (see 0003) — it does not consult the
-- token. This claim only decides what *renders*.
--
-- That distinction is what makes the staleness acceptable: tokens live about an
-- hour, so revoking someone's admin flag can leave them seeing the studio UI
-- until their token refreshes. They cannot *do* anything with it — every query
-- behind those screens is refused by RLS the moment the flag flips. If you ever
-- need an instant lockout, delete their session (Auth → Users → sign out) and
-- the next request re-mints the token.
--
-- The app treats only a `true` claim as authoritative and falls back to the
-- database otherwise, so granting admin still takes effect immediately.
--
-- AFTER APPLYING THIS you must enable the hook:
--   Dashboard → Authentication → Hooks → Customize Access Token (JWT) Claims
--   → Postgres → public.custom_access_token_hook → Enable.
-- Until then this migration is inert: the claim is simply absent and the app
-- keeps reading the database exactly as before.
--
-- Idempotent: safe to run more than once.
-- ============================================================

-- ---------- the hook ----------
-- `event` arrives as {"user_id": "...", "claims": {...}, ...} and whatever we
-- return under `claims` is signed into the token.
--
-- SECURITY DEFINER because it runs as supabase_auth_admin, which has no
-- business holding a general grant on application tables. search_path is
-- pinned: a SECURITY DEFINER function with a mutable search_path can be
-- hijacked by anyone able to create a schema.
create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  is_admin_flag boolean;
  claims jsonb;
begin
  select p.is_admin
    into is_admin_flag
    from public.profiles p
   where p.id = (event->>'user_id')::uuid;

  claims := coalesce(event->'claims', '{}'::jsonb);

  -- coalesce: a user with no profile row yet is not an admin, and the claim
  -- must still be present and false rather than null, or the app cannot tell
  -- "not an admin" from "hook never ran".
  claims := jsonb_set(
    claims,
    '{is_admin}',
    to_jsonb(coalesce(is_admin_flag, false))
  );

  return jsonb_set(event, '{claims}', claims);
end;
$$;

-- ---------- who may run it ----------
-- Only the auth server. Left executable by `public`, any logged-in user could
-- call it over PostgREST — harmless in itself (it only reads), but it is a
-- SECURITY DEFINER function and those should have the narrowest possible
-- caller list.
revoke execute on function public.custom_access_token_hook(jsonb) from public;
revoke execute on function public.custom_access_token_hook(jsonb) from anon;
revoke execute on function public.custom_access_token_hook(jsonb) from authenticated;

grant usage on schema public to supabase_auth_admin;
grant execute on function public.custom_access_token_hook(jsonb) to supabase_auth_admin;

-- ---------- letting the hook see profiles ----------
-- The function is SECURITY DEFINER so it runs as the owner and bypasses RLS,
-- but the auth server still needs the table grant to invoke it cleanly.
grant select on table public.profiles to supabase_auth_admin;

-- Belt and braces: if this function is ever changed to SECURITY INVOKER, this
-- policy is what keeps the hook working instead of silently returning null for
-- every user — which would read as "nobody is an admin" and lock the studio.
drop policy if exists "auth admin can read profiles" on public.profiles;
create policy "auth admin can read profiles"
  on public.profiles for select
  to supabase_auth_admin
  using (true);


-- ####################################################################
-- ### supabase/migrations/0016_sales_history.sql
-- ####################################################################

-- ============================================================
-- Takings from before the shop existed.
--
-- The studio traded before any of this was built, and that revenue should
-- appear on the Sales page rather than the chart implying the business started
-- the day the software did.
--
-- WHY NOT WRITE THEM AS ORDERS
--
-- Because they are not orders. An order is a transaction: a customer, a
-- basket, line items, a status it moves through. What survives from before is
-- a monthly total and nothing else. Writing that as an orders row would mean
-- every query touching orders — stock triggers, the status filter, the
-- best-seller aggregation — has to remember some rows are not really orders.
--
-- A separate table says what these are: a closing figure carried forward.
-- Nothing writes to it but hand, and nothing else reads it.
--
-- THE SHAPE OF THE FIX
--
-- monthly_sales (0006) stays exactly as it is — orders-derived, the live
-- figures, untouched. A new view unions it with this table, and the Sales page
-- reads that. So the ongoing flow is unchanged: every future sale, online or
-- offline, is still computed from orders. This table only covers the period
-- before there were any.
--
-- Idempotent: safe to run more than once.
-- ============================================================

-- ---------- the table ----------
create table if not exists public.sales_history (
  -- One row per month, keyed by its first day. A date rather than a text
  -- "2026-03" so ordering, grouping and date_trunc all work without parsing.
  month         date primary key,
  offline_cents int not null default 0 check (offline_cents >= 0),
  online_cents  int not null default 0 check (online_cents  >= 0),
  -- Generated, not stored by hand. A total column that can disagree with its
  -- parts is a bug waiting to happen, and this is data nobody will re-check.
  total_cents   int generated always as (offline_cents + online_cents) stored,
  note          text,
  created_at    timestamptz not null default now()
);

comment on table public.sales_history is
  'Monthly takings from before the shop was built. Hand-entered aggregates '
  'with no line items — everything after launch is computed from orders.';

-- Paise, like every other money column in this schema. ₹12,500 is 1250000.
comment on column public.sales_history.offline_cents is 'Paise. Rupees x 100.';
comment on column public.sales_history.online_cents  is 'Paise. Rupees x 100.';

-- ---------- who can see it ----------
-- Revenue figures are nobody's business but the studio's, so this is
-- admin-only in both directions. No anon or authenticated policy exists, and
-- RLS denies by default, so the storefront cannot read it at all.
alter table public.sales_history enable row level security;

drop policy if exists "admins manage sales history" on public.sales_history;
create policy "admins manage sales history"
  on public.sales_history for all
  using (public.is_admin())
  with check (public.is_admin());

-- ---------- the combined view ----------
-- Same column shape as monthly_sales, so the app reads one source and does not
-- care which rows came from where.
--
-- order_count is 0 for historical rows: the number of orders behind those
-- totals is genuinely unknown, and inventing one would make the Orders stat
-- lie. Revenue is known, so revenue is what they contribute.
--
-- The unpivot (one row per channel) matches how monthly_sales already reports,
-- which is what keeps the chart's per-channel breakdown working without the
-- page knowing this table exists.
--
-- security_invoker so the admin RLS policies apply to the caller rather than
-- the view owner — same reasoning as 0006.
create or replace view public.sales_by_month
with (security_invoker = true) as
      select month, channel, order_count, revenue_cents
        from public.monthly_sales
  union all
      select month::timestamptz, 'offline', 0, offline_cents
        from public.sales_history
       where offline_cents > 0
  union all
      select month::timestamptz, 'online', 0, online_cents
        from public.sales_history
       where online_cents > 0;

-- ---------- the figures ----------
-- Rupees in, paise stored — the x 100 happens here so the numbers below can be
-- read and checked against a notebook without doing arithmetic in your head.
--
-- on conflict do update rather than do nothing: correcting a figure should be
-- a matter of editing the values here and re-running the migration, not
-- hunting for an UPDATE to write. That is also what keeps this idempotent.
--
-- Months with no figure are simply absent — a missing month is honest, a zero
-- would claim the studio sold nothing that month.
insert into public.sales_history (month, offline_cents, online_cents, note)
select
  v.month,
  round(v.offline_rupees * 100),
  round(v.online_rupees  * 100),
  v.note
from (values
  -- month              offline ₹  online ₹   note
  ('2026-02-01'::date,      3000,        0,  'Before the shop was built'),
  ('2026-03-01'::date,      3100,        0,  'Before the shop was built'),
  ('2026-04-01'::date,      3740,     1750,  'Before the shop was built'),
  ('2026-05-01'::date,      4040,     1560,  'Before the shop was built'),
  ('2026-06-01'::date,     10990,      220,  'Before the shop was built'),
  ('2026-07-01'::date,     10930,     1490,  'Before the shop was built')
  -- offline ₹35,800 + online ₹5,020 = ₹40,820 across six months
) as v(month, offline_rupees, online_rupees, note)
on conflict (month) do update
  set offline_cents = excluded.offline_cents,
      online_cents  = excluded.online_cents,
      note          = excluded.note;


-- ####################################################################
-- ### supabase/migrations/0017_flat_shipping_fee.sql
-- ####################################################################

-- ============================================================
-- Charge a flat ₹80 shipping fee, computed here rather than trusted from the
-- browser.
--
-- orders.shipping_cents has existed since 0001 and was hardcoded to 0 —
-- shipping was settled by hand over WhatsApp, outside the recorded total. The
-- studio now wants a fixed fee shown up front, which means it has to be part
-- of what this function charges, not just a number the cart page prints.
--
-- Same reasoning CLAUDE.md already states for prices: nothing about what a
-- customer pays should be trustable from the client. The fee is a constant
-- inside this function, so a crafted request cannot claim its own shipping
-- cost any more than it can claim its own price.
--
-- shipping_cents is returned alongside the resolved lines, so the confirmation
-- screen and the WhatsApp message can show "Subtotal + Shipping = Total" built
-- from what the database actually charged — not recomputed client-side, which
-- is exactly the mismatch this schema has avoided everywhere else.
--
-- Idempotent: safe to run more than once.
-- ============================================================

drop function if exists public.place_whatsapp_order(jsonb, text, text, jsonb, text);

create function public.place_whatsapp_order(
  items         jsonb,
  customer_name text,
  phone         text,
  address       jsonb default null,
  email         text default null
)
returns table (
  order_number   bigint,
  subtotal_cents int,
  shipping_cents int,
  total_cents    int,
  lines          jsonb
)
language plpgsql
security definer
set search_path = public
as $$
declare
  max_lines      constant int := 50;
  -- ₹80. A named constant so the one call site raising it later is a search
  -- for this line, not a hunt through the function for a bare 8000.
  flat_shipping  constant int := 8000;
  basket         jsonb;
  new_order_id   uuid;
  subtotal       int;
  short_name     text;
  short_have     int;
  short_want     int;
begin
  if items is null or jsonb_typeof(items) <> 'array' then
    raise exception 'No items in the order';
  end if;
  if jsonb_array_length(items) = 0 then
    raise exception 'No items in the order';
  end if;
  if jsonb_array_length(items) > max_lines then
    raise exception 'Too many different items in one order';
  end if;

  if customer_name is null or btrim(customer_name) = '' then
    raise exception 'Please give a name';
  end if;
  if phone is null or btrim(phone) = '' then
    raise exception 'Please give a phone number';
  end if;

  -- Prices come from the products row; there is no price parameter, so a
  -- browser cannot set what something costs. Grouped by product, so sending
  -- the same id twice cannot slip past the stock check by splitting quantity.
  --
  -- Checked against raw stock_count only — two pending orders can both claim
  -- the last unit, and the second confirmation restores it. Accepted
  -- deliberately (2026-08-20, see docs/ROADMAP.md "Not doing"): pieces can be
  -- remade, so reserving stock at order time would refuse sales the studio
  -- would happily fulfil, for a race that is rare at this volume.
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
    into subtotal
    from jsonb_array_elements(basket) b;

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
    subtotal, flat_shipping, subtotal + flat_shipping, 'INR'
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
    select o.order_number, o.subtotal_cents, o.shipping_cents, o.total_cents,
           -- Only what was written. stock_count is dropped: it is an internal
           -- detail of the availability check, not something a customer needs.
           (select jsonb_agg(jsonb_build_object(
                     'name', b->>'name',
                     'quantity', (b->>'quantity')::int,
                     'unit_price_cents', (b->>'unit_price_cents')::int))
              from jsonb_array_elements(basket) b)
    from public.orders o
    where o.id = new_order_id;
end;
$$;

grant execute on function public.place_whatsapp_order(jsonb, text, text, jsonb, text)
  to anon, authenticated;


-- ####################################################################
-- ### supabase/migrations/0018_prepared_flag.sql
-- ####################################################################

-- ============================================================
-- Track which line items the studio has physically prepared.
--
-- Studio-only bookkeeping, tracked per order line rather than per order: a
-- multi-item order can have some pieces ready and others still being made,
-- and "prepared" for the whole order would hide that.
--
-- Not the order lifecycle. pending/paid/shipped/delivered/cancelled (0001)
-- describes the transaction — has it been paid, has it left the building.
-- Prepared describes physical work in the studio and has no bearing on any
-- of those; an order can be paid and not yet prepared, or prepared and not
-- yet paid if the studio gets ahead of itself. Kept as its own column so the
-- two do not tangle.
--
-- In the database rather than localStorage, because the admin checks orders
-- from more than one device — a laptop at the desk, a phone at a market
-- stall — and a tick that only lives in one browser is not tracking, it is a
-- note that reads as done from one screen and undone from every other.
--
-- Idempotent: safe to run more than once.
-- ============================================================

alter table public.order_items
  add column if not exists prepared boolean not null default false;

-- ---------- who can flip it ----------
-- order_items has never had an UPDATE policy: every existing write goes
-- through place_whatsapp_order or record_offline_sale, both SECURITY DEFINER,
-- so RLS was never in the path. This one is a direct admin edit from the
-- dashboard, so it needs a policy of its own — same shape as "admins update
-- orders" in 0003.
drop policy if exists "admins update order items" on public.order_items;
create policy "admins update order items"
  on public.order_items for update
  using (public.is_admin())
  with check (public.is_admin());


-- ####################################################################
-- ### supabase/migrations/0019_categories_trinkets_and_others.sql
-- ####################################################################

-- ============================================================
-- Two more categories: Trinkets, and an Others catch-all.
--
-- Categories are seeded, not managed through the admin panel — that was
-- skipped deliberately (docs/ROADMAP.md, "Not doing"), on the grounds that
-- adding one is a single insert once or twice a year. This is that insert.
--
-- It lives in a migration rather than only in seed_categories.sql because the
-- seed runs against a fresh project and does nothing to the live one. Putting
-- it here means the rows arrive both places from a single source.
--
-- sort_order continues from 8, and Others is last on purpose: a catch-all
-- reads as a leftovers bin wherever it sits, so it should sit at the end.
--
-- image_url is left null. The category card checks whether the URL is set,
-- not whether the image loads, so an unlinked category shows a tidy "Coming
-- soon" tile tinted with its own accent. Do NOT run link_category_images.sql
-- until photos for these two are actually uploaded — it sets every null row
-- and would turn those placeholders into broken images.
--
-- Idempotent: on conflict (slug) do nothing.
-- ============================================================

insert into public.categories (slug, name, accent_color, sort_order) values
  ('trinkets', 'Trinkets', '#C8F0B4',  9),
  ('others',   'Others',   '#EAD9C9', 10)
on conflict (slug) do nothing;


-- ####################################################################
-- ### supabase/migrations/0020_reorder_categories_trinkets_before_tote_bags.sql
-- ####################################################################

-- ============================================================
-- Move Trinkets ahead of Tote Bags and Stickers on the homepage scroller.
--
-- 0019 appended Trinkets and Others at 9 and 10, which put Trinkets — a
-- category with real stock — behind the two that have neither photos nor
-- pieces yet, so the row read as three "Coming soon" tiles in a run before
-- anything you could actually buy.
--
-- Stated as the whole running order rather than as a nudge to one row.
-- getCategories() sorts on sort_order with no tiebreaker, so two categories
-- sharing a number come back in whatever order Postgres feels like that day —
-- listing all ten is how the file makes a collision visible instead of
-- accidental.
--
-- seed_categories.sql carries the same numbers for the original eight, and
-- has to: in setup_new_project.sql every migration runs before the seeds, so
-- on a fresh project this update finds no tote-bags row to fix and the seed's
-- own value is what survives.
--
-- Idempotent: assigns absolute values, so re-running changes nothing.
-- ============================================================

update public.categories as c
   set sort_order = v.sort_order
  from (values
    ('phone-charms',            1),
    ('keychains-worry-stones',  2),
    ('bookmarks',               3),
    ('paintings',               4),
    ('bag-charms',              5),
    ('fridge-magnets',          6),
    ('trinkets',                7),
    ('tote-bags',               8),
    ('stickers',                9),
    ('others',                 10)
  ) as v(slug, sort_order)
 where c.slug = v.slug
   and c.sort_order is distinct from v.sort_order;


-- ####################################################################
-- ### supabase/migrations/0021_offline_sale_extra.sql
-- ####################################################################

-- ============================================================
-- An offline sale can carry an "extra" amount: money taken for things that
-- are not in the catalogue.
--
-- Stalls sell what the shop does not list — offcuts, a one-off nobody
-- photographed, a bundle priced on the spot. Today that money has nowhere to
-- go, so the day's takings recorded here are smaller than the day's takings
-- in the tin.
--
-- Recorded as an amount on the order, NOT as a line item. The same reasoning
-- as sales_history in 0016: a line item asserts a piece, a price and a
-- quantity that were never recorded. Inventing one would inflate "Pieces
-- sold", put a fictional entry in the best-seller ranking, and — because
-- order_items.product_id would be null — describe stock that never moved.
-- An amount is the only part of this that is actually known.
--
-- It reaches the reports for free: monthly_sales (0006) and therefore
-- sales_by_month (0016) sum orders.total_cents, and extra is inside it.
-- Revenue counts it; unit counts, which read order_items, correctly do not.
--
-- Idempotent: safe to run more than once.
-- ============================================================

-- ---------- 1. the column ----------
alter table public.orders
  add column if not exists extra_cents int not null default 0;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'orders_extra_cents_check'
  ) then
    alter table public.orders
      add constraint orders_extra_cents_check check (extra_cents >= 0);
  end if;
end $$;

comment on column public.orders.extra_cents is
  'Part of subtotal_cents taken for unlisted goods. Descriptive only — the '
  'money is already in the totals; this says how much of it had no line item.';

-- ---------- 2. the function ----------
-- Dropped rather than replaced: adding a parameter creates an overload, and
-- PostgREST resolves rpc() calls by argument name — two candidates both
-- satisfied by {items, sold_on} is an ambiguity error at call time, not a
-- helpful default.
--
-- `note` goes with it. It has been in the signature since 0009 and the body
-- has never once read it; PostgREST advertises it, so it reads as a feature
-- that quietly discards what you put in it.
drop function if exists public.record_offline_sale(jsonb, date, text);

create or replace function public.record_offline_sale(
  items       jsonb,
  sold_on     date default current_date,
  extra_cents int  default 0
)
returns uuid
language plpgsql
security invoker
as $$
declare
  new_order_id uuid;
  items_cents  int;
  extra        int := coalesce(extra_cents, 0);
  has_items    boolean := items is not null and jsonb_typeof(items) = 'array'
                          and jsonb_array_length(items) > 0;
begin
  if extra < 0 then
    raise exception 'An extra amount cannot be negative';
  end if;

  -- Either half is enough on its own: a day may be all catalogue pieces, all
  -- unlisted oddments, or both.
  if not has_items and extra = 0 then
    raise exception 'A sale needs at least one item or an extra amount';
  end if;

  select coalesce(sum((i->>'quantity')::int * (i->>'unit_price_cents')::int), 0)
    into items_cents
    from jsonb_array_elements(coalesce(items, '[]'::jsonb)) i;

  insert into public.orders (
    channel, status, contact_email,
    subtotal_cents, shipping_cents, total_cents, extra_cents, currency,
    created_at
  )
  values (
    'offline', 'paid', null,
    -- Extra is inside the subtotal, so subtotal + shipping = total still holds
    -- for every order in the table. extra_cents alongside it says how much of
    -- that subtotal no line item accounts for.
    items_cents + extra, 0, items_cents + extra, extra, 'INR',
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
  from jsonb_array_elements(coalesce(items, '[]'::jsonb)) i
  join public.products p on p.id = (i->>'product_id')::uuid
  where (i->>'quantity')::int > 0;

  -- Only meaningful when pieces were actually tapped. An extra-only sale has
  -- no line items by design, and must not be read as every id having failed
  -- to resolve.
  if has_items
     and not exists (select 1 from public.order_items where order_id = new_order_id)
  then
    raise exception 'None of those products could be found';
  end if;

  -- Stamped even with no line items, so decrement_stock_on_confirm (0010) has
  -- nothing left to do if this order is ever updated.
  update public.orders
     set stock_deducted_at = now()
   where id = new_order_id;

  return new_order_id;
end;
$$;

-- ---------- try it ----------
--   select public.record_offline_sale('[]'::jsonb, current_date, 25000);  -- ₹250, nothing listed


-- ####################################################################
-- ### supabase/seed_categories.sql
-- ####################################################################

-- ============================================================
-- Art Speaks — category rows (real data).
-- Images intentionally omitted (image_url stays null) — add later via the
-- Table Editor or:  update public.categories set image_url = '...' where slug = '...';
-- Re-runnable: on conflict (slug) do nothing.
--
-- NOT the whole list. Categories added after this file was written live in
-- numbered migrations instead, so they reach the live project and not only a
-- fresh one — see 0019 for Trinkets and Others. Kept out of here on purpose:
-- a row defined in two files is a row that can drift.
--
-- The sort_order gap at 7 is not a mistake: 0020 states the full running order
-- and puts Trinkets there. The numbers below must agree with it. Migrations
-- all run before the seeds in setup_new_project.sql, so on a fresh project
-- 0020 finds none of these rows and whatever is written here is what sticks.
-- ============================================================

insert into public.categories (slug, name, accent_color, sort_order) values
  ('phone-charms',           'Phone Charms',           '#FFB7CE', 1),
  ('keychains-worry-stones', 'Keychains/Worry Stones', '#E0BBE4', 2),
  ('bookmarks',              'Bookmarks',              '#98FFD9', 3),
  ('paintings',              'Paintings',              '#FDFFAB', 4),
  ('bag-charms',             'Bag Charms',             '#FFD3B0', 5),
  ('fridge-magnets',         'Fridge Magnets',         '#AEE2FF', 6),
  ('tote-bags',              'Tote Bags',              '#C7CEEA', 8),
  ('stickers',               'Stickers',               '#FFAAA7', 9)
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
-- Does NOT touch categories, orders or anything else.
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
-- ### Storage
-- ####################################################################
-- Nothing to do here — the product-images bucket and its policies are created
-- by migration 0013, included above. They used to live in this footer, which
-- meant a project rebuilt from migrations/ alone got a public bucket with no
-- write policy.

-- ####################################################################
-- ### Check it worked
-- ####################################################################
-- Expect 8 categories, 8 products, prices 50 / 70 / 120.
--   select (select count(*) from public.categories) as categories,
--          (select count(*) from public.products)   as products;
--   select name, price_rupees, stock_count from public.products_in_rupees;
