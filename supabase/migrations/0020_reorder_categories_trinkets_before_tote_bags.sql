-- ============================================================
-- Move Trinkets ahead of Tote Bags and Stickers on the homepage scroller.
--
-- 0019 appended Trinkets and Others at 9 and 10, which put Trinkets — a
-- category with real stock — behind the two that have neither photos nor
-- pieces yet, so the row read as three "Coming soon" tiles in a run before
-- anything you could actually buy.
--
-- Stated as the whole running order rather than as a nudge to one row.
-- getCategories() sorts on sort_order with no tiebreaker, so two categories
-- sharing a number come back in whatever order Postgres feels like that day —
-- listing all ten is how the file makes a collision visible instead of
-- accidental.
--
-- seed_categories.sql carries the same numbers for the original eight, and
-- has to: in setup_new_project.sql every migration runs before the seeds, so
-- on a fresh project this update finds no tote-bags row to fix and the seed's
-- own value is what survives.
--
-- Idempotent: assigns absolute values, so re-running changes nothing.
-- ============================================================

update public.categories as c
   set sort_order = v.sort_order
  from (values
    ('phone-charms',            1),
    ('keychains-worry-stones',  2),
    ('bookmarks',               3),
    ('paintings',               4),
    ('bag-charms',              5),
    ('fridge-magnets',          6),
    ('trinkets',                7),
    ('tote-bags',               8),
    ('stickers',                9),
    ('others',                 10)
  ) as v(slug, sort_order)
 where c.slug = v.slug
   and c.sort_order is distinct from v.sort_order;
