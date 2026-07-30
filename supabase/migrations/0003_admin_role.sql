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
