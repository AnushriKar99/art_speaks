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
-- best-seller / new-arrival are computed in the app, so no flags here.
-- ============================================================
create table public.products (
  id           uuid primary key default gen_random_uuid(),
  slug         text not null unique,
  name         text not null,
  description  text,
  artisan_note text,
  price_cents  int not null check (price_cents >= 0),
  currency     text not null default 'USD',
  stock_count  int not null default 0 check (stock_count >= 0),
  category_id  uuid references public.categories(id) on delete set null,
  images       text[] not null default '{}',
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
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
