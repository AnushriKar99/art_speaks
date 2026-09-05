-- ============================================================
-- Art Speaks — category rows (real data).
-- Images intentionally omitted (image_url stays null) — add later via the
-- Table Editor or:  update public.categories set image_url = '...' where slug = '...';
-- Re-runnable: on conflict (slug) do nothing.
--
-- NOT the whole list. Categories added after this file was written live in
-- numbered migrations instead, so they reach the live project and not only a
-- fresh one — see 0019 for Trinkets and Others. Kept out of here on purpose:
-- a row defined in two files is a row that can drift.
--
-- The sort_order gap at 7 is not a mistake: 0020 states the full running order
-- and puts Trinkets there. The numbers below must agree with it. Migrations
-- all run before the seeds in setup_new_project.sql, so on a fresh project
-- 0020 finds none of these rows and whatever is written here is what sticks.
-- ============================================================

insert into public.categories (slug, name, accent_color, sort_order) values
  ('phone-charms',           'Phone Charms',           '#FFB7CE', 1),
  ('keychains-worry-stones', 'Keychains/Worry Stones', '#E0BBE4', 2),
  ('bookmarks',              'Bookmarks',              '#98FFD9', 3),
  ('paintings',              'Paintings',              '#FDFFAB', 4),
  ('bag-charms',             'Bag Charms',             '#FFD3B0', 5),
  ('fridge-magnets',         'Fridge Magnets',         '#AEE2FF', 6),
  ('tote-bags',              'Tote Bags',              '#C7CEEA', 8),
  ('stickers',               'Stickers',               '#FFAAA7', 9)
on conflict (slug) do nothing;
