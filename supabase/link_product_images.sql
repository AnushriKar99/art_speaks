-- ============================================================
-- Point every product at its uploaded photo.
--
-- Works only if you name each file after the product's slug — upload
-- `heart-bow-pin.jpg` for the product with slug `heart-bow-pin` — because it
-- builds the URL from the slug rather than making you paste eight of them.
--
-- Current slugs:
--   heart-bow-pin   bow-pin-1   bow-pin-2   strawberry-pin
--   frog-pin        starry-night   winter   wheat-field-with-cypresses
--
-- Upload first (Storage → product-images → Upload file), then run this.
-- Products with no matching file just keep the 🥺 placeholder — a wrong URL
-- would render a broken image, which is worse.
-- ============================================================

-- ---------- all .jpg uploads in one go ----------
update public.products
set images = array[
  'https://udflrtaipqzbsfhtzuue.supabase.co/storage/v1/object/public/product-images/'
    || slug || '.jpg'
]
where images = '{}';          -- never overwrites a photo already set

-- ---------- if some are .png or .webp ----------
-- Run the block above for the .jpgs, then fix the odd ones out by hand:
--
--   update public.products
--   set images = array['https://udflrtaipqzbsfhtzuue.supabase.co/storage/v1/object/public/product-images/frog-pin.png']
--   where slug = 'frog-pin';

-- ---------- more than one photo per product ----------
-- `images` is a text[], and the first entry is the one grids and cards show:
--
--   update public.products
--   set images = array[
--     'https://…/product-images/starry-night.jpg',
--     'https://…/product-images/starry-night-back.jpg'
--   ]
--   where slug = 'starry-night';

-- ---------- check ----------
--   select name, image_count from public.products_in_rupees order by image_count, name;
-- image_count 0 means that product still needs a photo.
--
-- Then open each URL in a private window. A 200 means it is genuinely public;
-- a 400 means the file name does not match the slug.
