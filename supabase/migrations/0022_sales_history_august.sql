-- ============================================================
-- August 2026 takings: offline ₹9,530 + online ₹2,420 = ₹11,950.
--
-- August is the first month that straddles launch — the site went live on
-- 2026-08-19 — so this is the first figure that could have collided with the
-- live ones. sales_by_month unions this table with monthly_sales, which is
-- computed from orders, so a month entered here that also has orders behind it
-- is counted twice.
--
-- Confirmed with the studio before applying: nothing was recorded through the
-- shop or the admin panel in August, so these figures are the whole month and
-- there is nothing to subtract. The note column carries that, because in a
-- year nobody will remember whether August was a whole month or the part
-- before the site opened.
--
-- That also means: do not back-date an offline sale into August later. It
-- would be added to these figures, not reconciled against them.
--
-- Not written as orders, for the reason 0016 gives at length: what survives is
-- a monthly total, not transactions. No line items, no stock movement, and
-- order_count stays 0 so the Orders tile does not claim a number nobody
-- counted.
--
-- If entering a month by hand becomes a habit rather than an exception, the
-- answer is a small admin screen writing to this table — not a migration per
-- month. Two is not yet a pattern.
--
-- Idempotent: on conflict do update, so correcting a figure means editing the
-- values here and re-running.
-- ============================================================

insert into public.sales_history (month, offline_cents, online_cents, note)
select
  v.month,
  round(v.offline_rupees * 100),
  round(v.online_rupees  * 100),
  v.note
from (values
  -- month              offline ₹  online ₹   note
  ('2026-08-01'::date,      9530,     2420,  'Whole month, hand-entered — nothing was recorded through the shop in August')
) as v(month, offline_rupees, online_rupees, note)
on conflict (month) do update
  set offline_cents = excluded.offline_cents,
      online_cents  = excluded.online_cents,
      note          = excluded.note;

-- ---------- check ----------
--   select month, offline_cents/100.0 as offline, online_cents/100.0 as online,
--          total_cents/100.0 as total, note
--     from public.sales_history order by month;
