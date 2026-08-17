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
