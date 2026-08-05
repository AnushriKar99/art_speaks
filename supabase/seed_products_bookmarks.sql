-- ============================================================
-- Art Speaks — pin bookmark range (first real inventory)
--
-- Safe to re-run: `on conflict (slug) do update` refreshes an existing row
-- rather than erroring or duplicating. Edit a price here, paste again, done.
--
-- Does NOT touch categories, orders or anything else — unlike seed.sql, which
-- truncates half the database and should not be run against live data.
--
-- Photos are deliberately empty ('{}'). The storefront shows a 🥺 placeholder
-- for products without one, so listings can go up before the shoot. Add them
-- later with:
--   update public.products
--      set images = array['https://…/storage/v1/object/public/product-images/heart-bow-pin.jpg']
--    where slug = 'heart-bow-pin';
--
-- WRITE PRICES IN RUPEES. ₹50 is just 50 below — the insert multiplies by 100
-- on its way into price_cents, which stores paise because that is what payment
-- gateways expect. You never have to do that arithmetic yourself.
-- ============================================================

with copy as (
  select
    'Say goodbye to lost pages! These pin bookmarks feature adorable handmade clay charms on a paper pin, so they''re easy to find and even easier to pop in and out of your book. Cute, functional, and made to bring a smile every time you open your book.'::text
      as description,
    'Made entirely by hand, right down to the backcard, so each piece has its own little variations.'::text
      as artisan_note
),
cat as (
  select id from public.categories where slug = 'bookmarks'
),
--                                                              ₹ rupees   stock
items (slug, name, price_rupees, stock_count) as (
  values
    ('heart-bow-pin',              'Heart Bow Pin',               50::int,  2::int),
    ('bow-pin-1',                  'Bow Pin (1)',                 50,       2),
    ('bow-pin-2',                  'Bow Pin (2)',                 50,       2),
    ('strawberry-pin',             'Strawberry Pin',              70,       6),
    ('frog-pin',                   'Frog Pin',                    70,       2),
    -- "Starry Night" was listed twice (stock 2 and stock 1). Treated as one
    -- product with stock 3 — two identical names would show as duplicate
    -- listings in the shop. If they are genuinely different pieces, split this
    -- into 'starry-night-1' / 'starry-night-2' with distinct names.
    ('starry-night',               'Starry Night',               120,       3),
    ('winter',                     'Winter',                     120,       1),
    ('wheat-field-with-cypresses', 'Wheat Field with Cypresses', 120,       1)
)
insert into public.products
  (slug, name, description, artisan_note, price_cents, currency,
   stock_count, category_id, images, is_active, is_best_seller, is_new_arrival)
select
  i.slug, i.name, c.description, c.artisan_note,
  i.price_rupees * 100,          -- rupees → paise, so you never type paise
  'INR',
  i.stock_count, cat.id, '{}', true, true, true
from items i, copy c, cat
on conflict (slug) do update set
  name           = excluded.name,
  description    = excluded.description,
  artisan_note   = excluded.artisan_note,
  price_cents    = excluded.price_cents,
  currency       = excluded.currency,
  stock_count    = excluded.stock_count,
  category_id    = excluded.category_id,
  is_active      = excluded.is_active,
  is_best_seller = excluded.is_best_seller,
  is_new_arrival = excluded.is_new_arrival;
  -- images is deliberately NOT overwritten, so re-running this file never
  -- wipes photos you have already uploaded.

-- Check what landed, shown back in rupees:
--   select name, price_cents / 100 as rupees, stock_count
--   from public.products order by name;
