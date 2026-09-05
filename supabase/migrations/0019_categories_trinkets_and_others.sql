-- ============================================================
-- Two more categories: Trinkets, and an Others catch-all.
--
-- Categories are seeded, not managed through the admin panel — that was
-- skipped deliberately (docs/ROADMAP.md, "Not doing"), on the grounds that
-- adding one is a single insert once or twice a year. This is that insert.
--
-- It lives in a migration rather than only in seed_categories.sql because the
-- seed runs against a fresh project and does nothing to the live one. Putting
-- it here means the rows arrive both places from a single source.
--
-- sort_order continues from 8, and Others is last on purpose: a catch-all
-- reads as a leftovers bin wherever it sits, so it should sit at the end.
--
-- image_url is left null. The category card checks whether the URL is set,
-- not whether the image loads, so an unlinked category shows a tidy "Coming
-- soon" tile tinted with its own accent. Do NOT run link_category_images.sql
-- until photos for these two are actually uploaded — it sets every null row
-- and would turn those placeholders into broken images.
--
-- Idempotent: on conflict (slug) do nothing.
-- ============================================================

insert into public.categories (slug, name, accent_color, sort_order) values
  ('trinkets', 'Trinkets', '#C8F0B4',  9),
  ('others',   'Others',   '#EAD9C9', 10)
on conflict (slug) do nothing;
