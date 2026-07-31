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
