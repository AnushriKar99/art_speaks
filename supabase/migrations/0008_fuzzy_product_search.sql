-- ============================================================
-- Typo-tolerant product search.
--
-- Substring search (ILIKE '%term%') only matches text that is literally
-- present, so "strawbery" finds nothing even though "Strawberry Pin" is
-- clearly what was meant. Shoppers mistype constantly, and a shop that
-- answers "no matches" to a near-miss looks empty rather than forgiving.
--
-- pg_trgm scores similarity by breaking strings into three-character chunks
-- and comparing overlap. "strawbery" and "strawberry" share nearly all their
-- trigrams, so they score highly; "winter" and "strawberry" share almost none.
--
-- This does NOT replace the ILIKE search in lib/data/products.ts. Substring
-- matching is better for the common case (typing "bow" should find every bow),
-- so the app tries that first and only falls back to this when it finds
-- nothing. Exact-ish matches stay exact; fuzziness is the safety net.
--
-- Idempotent: safe to run more than once.
-- ============================================================

create extension if not exists pg_trgm;

-- ---------- indexes ----------
-- GIN over trigrams, so similarity search doesn't scan every row once the
-- catalogue grows. One per column we search.
create index if not exists products_name_trgm_idx
  on public.products using gin (name gin_trgm_ops);

create index if not exists products_description_trgm_idx
  on public.products using gin (description gin_trgm_ops);

-- ---------- the search function ----------
-- SECURITY INVOKER (the default) so the products RLS still applies: an
-- inactive product stays invisible to the storefront through this path too.
--
-- Returns the same shape the app already maps, plus `score` so the caller can
-- order by relevance rather than name.
create or replace function public.search_products_fuzzy(
  search_term text,
  min_score   real default 0.15,
  max_results int  default 50
)
returns table (
  id             uuid,
  slug           text,
  name           text,
  description    text,
  artisan_note   text,
  price_cents    int,
  currency       text,
  stock_count    int,
  images         text[],
  is_best_seller boolean,
  is_new_arrival boolean,
  category_slug  text,
  score          real
)
language sql
stable
as $$
  select
    p.id, p.slug, p.name, p.description, p.artisan_note,
    p.price_cents, p.currency, p.stock_count, p.images,
    p.is_best_seller, p.is_new_arrival,
    c.slug as category_slug,
    -- Best match across the fields worth scoring. The name carries the most
    -- signal, so it is weighted above the longer prose fields, where a short
    -- search term is diluted by surrounding text.
    greatest(
      similarity(p.name, search_term),
      similarity(coalesce(c.name, ''), search_term),
      similarity(coalesce(p.description, ''),  search_term) * 0.5,
      similarity(coalesce(p.artisan_note, ''), search_term) * 0.5
    )::real as score
  from public.products p
  left join public.categories c on c.id = p.category_id
  where greatest(
          similarity(p.name, search_term),
          similarity(coalesce(c.name, ''), search_term),
          similarity(coalesce(p.description, ''),  search_term) * 0.5,
          similarity(coalesce(p.artisan_note, ''), search_term) * 0.5
        ) >= min_score
  order by score desc, p.name
  limit max_results;
$$;

-- ---------- try it ----------
--   select name, round(score::numeric, 3) from public.search_products_fuzzy('strawbery');
--   select name, round(score::numeric, 3) from public.search_products_fuzzy('bokmark');
--   select name, round(score::numeric, 3) from public.search_products_fuzzy('hart bow');
