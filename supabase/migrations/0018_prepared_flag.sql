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
