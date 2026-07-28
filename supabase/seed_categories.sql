-- ============================================================
-- Art Speaks — category rows (real data).
-- Images intentionally omitted (image_url stays null) — add later via the
-- Table Editor or:  update public.categories set image_url = '...' where slug = '...';
-- Re-runnable: on conflict (slug) do nothing.
-- ============================================================

insert into public.categories (slug, name, accent_color, sort_order) values
  ('phone-charms',           'Phone Charms',           '#FFB7CE', 1),
  ('keychains-worry-stones', 'Keychains/Worry Stones', '#E0BBE4', 2),
  ('bookmarks',              'Bookmarks',              '#98FFD9', 3),
  ('paintings',              'Paintings',              '#FDFFAB', 4),
  ('bag-charms',             'Bag Charms',             '#FFD3B0', 5),
  ('fridge-magnets',         'Fridge Magnets',         '#AEE2FF', 6),
  ('tote-bags',              'Tote Bags',              '#C7CEEA', 7),
  ('stickers',               'Stickers',               '#FFAAA7', 8)
on conflict (slug) do nothing;
