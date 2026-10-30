-- ============================================================
-- 0025_remove_cancelled_orders.sql
-- Purge legacy cancelled orders and their cascaded line items.
--
-- Why:
-- Cleans up cancelled test and abandoned orders prior to rolling out
-- the 30-minute inventory lock flow (0026).
--
-- Safety:
-- 1. public.order_items and public.reviews reference public.orders(id)
--    with ON DELETE CASCADE, so child rows are cleanly removed.
-- 2. Under the current schema, cancelled orders never decremented stock
--    (stock is only deducted on 'paid' status), so product inventory
--    counts remain completely untouched and accurate.
-- 3. Monthly sales reporting (public.monthly_sales) only tracks
--    status IN ('paid', 'shipped', 'delivered'), so financial analytics
--    are unaffected.
--
-- Idempotent: safe to run multiple times.
-- ============================================================

DELETE FROM public.orders
WHERE status = 'cancelled';
