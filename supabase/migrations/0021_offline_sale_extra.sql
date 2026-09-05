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
