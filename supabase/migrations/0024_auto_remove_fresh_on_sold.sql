-- ============================================================
-- Automatically clear is_new_arrival when a product sells out.
--
-- The "Fresh out of the oven" section on the homepage showcase is intended
-- for newly arrived designs currently available to purchase. Once a piece
-- sells out (stock_count reaches 0), it is no longer fresh and should not
-- occupy a slot in that showcase.
--
-- Restocking an item does NOT restore is_new_arrival — the flag is for new
-- designs, which an admin can toggle manually if they ever choose to.
--
-- 1. Trigger: whenever stock_count reaches 0 or below, automatically clear
--    is_new_arrival.
-- 2. Backfill: clean up existing products that have is_new_arrival = true
--    and stock_count <= 0.
--
-- Idempotent: safe to run more than once.
-- ============================================================

-- ---------- 1. the trigger function ----------
create or replace function public.clear_new_arrival_on_sold_out()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.stock_count <= 0 and new.is_new_arrival = true then
    new.is_new_arrival := false;
  end if;
  return new;
end;
$$;

-- ---------- 2. attach trigger to products ----------
drop trigger if exists products_clear_new_arrival_on_sold_out on public.products;
create trigger products_clear_new_arrival_on_sold_out
  before insert or update on public.products
  for each row
  execute function public.clear_new_arrival_on_sold_out();

-- ---------- 3. backfill: clear existing sold-out new arrivals ----------
update public.products
   set is_new_arrival = false
 where is_new_arrival = true
   and stock_count <= 0;
