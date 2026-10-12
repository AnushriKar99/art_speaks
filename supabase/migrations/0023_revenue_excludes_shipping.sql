-- ============================================================
-- Exclude shipping fees from monthly sales revenue.
--
-- Shipping charges are collected from the customer to pay the courier / delivery
-- partner, not studio revenue. Previously, monthly_sales summed orders.total_cents,
-- which meant each paid online/WhatsApp order inflated revenue by the ₹80 shipping fee.
--
-- Now monthly_sales sums orders.subtotal_cents:
-- - Offline sales: shipping_cents is 0, so subtotal_cents equals total_cents.
-- - WhatsApp / online orders: subtotal_cents is the merchandise total,
--   excluding shipping_cents.
--
-- Idempotent: safe to run more than once.
-- ============================================================

create or replace view public.monthly_sales
with (security_invoker = true) as
  select date_trunc('month', created_at) as month,
         channel,
         count(*)             as order_count,
         sum(subtotal_cents)  as revenue_cents
  from public.orders
  where status in ('paid','shipped','delivered')
  group by 1, 2;
