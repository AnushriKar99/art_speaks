-- ============================================================
-- Point each category at its uploaded photo.
--
-- Upload into a `categories/` folder inside the product-images bucket, named
-- after the slug — Storage → product-images → Create folder → "categories",
-- then upload into it. The folder keeps category art from being mixed in with
-- product shots when the bucket has a few hundred files in it.
--
--   categories/phone-charms.jpg
--   categories/keychains-worry-stones.jpg
--   categories/bookmarks.jpg
--   categories/paintings.jpg
--   categories/bag-charms.jpg
--   categories/fridge-magnets.jpg
--   categories/tote-bags.jpg
--   categories/stickers.jpg
--
-- Then run this. It builds each URL from the slug, so there is nothing to
-- paste. A category with no matching file keeps the shared placeholder rather
-- than showing a broken image.
--
-- NOTE: categories are cached for an hour, so a change here will not appear on
-- the site immediately. Restart the dev server to see it at once.
-- ============================================================

update public.categories
set image_url =
  'https://udflrtaipqzbsfhtzuue.supabase.co/storage/v1/object/public/product-images/categories/'
  || slug || '.jpg'
where image_url is null;      -- never overwrites one already set

-- ---------- if some are .png or .webp ----------
--   update public.categories
--   set image_url = 'https://udflrtaipqzbsfhtzuue.supabase.co/storage/v1/object/public/product-images/categories/stickers.png'
--   where slug = 'stickers';

-- ---------- to redo one after re-uploading ----------
-- Storage caches by URL, so replacing a file under the same name leaves the old
-- picture on screen for up to an hour. Add a version marker to force it:
--   update public.categories
--   set image_url = image_url || '?v=2'
--   where slug = 'bookmarks';

-- ---------- check ----------
--   select name, slug,
--          case when image_url is null then 'no image' else 'linked' end as status
--   from public.categories order by sort_order;
