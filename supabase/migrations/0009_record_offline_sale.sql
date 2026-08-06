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
