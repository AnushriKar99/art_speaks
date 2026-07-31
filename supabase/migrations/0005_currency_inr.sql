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
