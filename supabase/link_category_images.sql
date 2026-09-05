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
--   categories/trinkets.jpg
--   categories/others.jpg
--
-- Then run this. It builds each URL from the slug, so there is nothing to
-- paste. A category with no matching file keeps the shared placeholder rather
-- than showing a broken image.
--
-- NOTE: categories are cached for an hour (unstable_cache in lib/data/products
-- .ts), so a change here does not appear on the site immediately.
--
-- Restarting the dev server does NOT clear it — that cache is written to disk
-- and survives a restart. Under Turbopack it lives in `.next/dev/cache`, not
-- the `.next/cache` you would expect. To see a change at once:
--
--   rm -r .next/dev/cache      (with the dev server stopped)
--
-- Nothing else in .next/dev needs removing; the build output is fine.
--
-- WARNING: this script sets EVERY category with a null image_url, so it will
-- point categories at files that were never uploaded. The card checks whether
-- the URL is set, not whether the file loads, so those go from a tidy "Coming
-- soon" placeholder to a broken image. Unless you have just uploaded all ten,
-- link one row at a time:
--
--   update public.categories
--      set image_url = '...categories/bag-charms.jpg'
--    where slug = 'bag-charms';
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
