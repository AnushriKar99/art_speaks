-- ============================================================
-- A rupee-facing view of products, for reading in the Supabase dashboard.
--
-- price_cents stores paise, because that is the unit payment gateways expect
-- and integers keep money free of floating-point rounding. The trade-off is
-- that the dashboard's Table Editor shows a ₹50 pin as 5000, since it reads
-- the database directly and never runs formatPrice().
--
-- This view does that division once, so the Table Editor sidebar has an entry
-- that reads in rupees. It is a saved query, not a copy — the numbers can
-- never drift from the products table.
--
-- READ ONLY in practice: writing to it would need an INSTEAD OF trigger, which
-- is deliberately not added. Insert and update through `products`, where the
-- unit is unambiguous. The seed files already take rupees and convert on the
-- way in.
--
-- security_invoker = true runs the view as whoever queries it, so the RLS on
-- products still applies. Without it a view can quietly become a way around
-- your own access rules.
--
-- Idempotent: safe to run more than once.
-- ============================================================

drop view if exists public.products_in_rupees;

create view public.products_in_rupees
with (security_invoker = true) as
  select
    p.id,
    p.name,
    p.slug,
    -- Numeric, not integer division, so a ₹49.50 piece shows as 49.50 rather
    -- than being silently truncated to 49.
    round(p.price_cents / 100.0, 2) as price_rupees,
    p.stock_count,
    c.name        as category,
    p.is_active,
    p.is_best_seller,
    p.is_new_arrival,
    cardinality(p.images) as image_count,   -- 0 = still shows the 🥺 placeholder
    p.created_at,
    p.updated_at
  from public.products p
  left join public.categories c on c.id = p.category_id
  order by p.name;

comment on view public.products_in_rupees is
  'Read-only rupee view of products for the dashboard. Edit products directly; price_cents there is in paise.';
