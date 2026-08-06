-- ============================================================
-- Fix: place_whatsapp_order could never complete.
--
-- 0011 built the basket in a temporary table and reset it with an
-- unqualified `delete from _basket`. Supabase runs with safe-update mode
-- enabled, which rejects DELETE and UPDATE without a WHERE clause, so every
-- call failed with "DELETE requires a WHERE clause" — including the guard
-- paths, which meant even the validation errors were the wrong error.
--
-- Rewritten to resolve the basket into a jsonb value instead. No temporary
-- table, so nothing to reset and nothing for safe-update to object to.
--
-- Also fixes a hole the temp-table version had: the same product sent twice
-- produced two lines that each passed the stock check individually while
-- exceeding it together. Lines are now aggregated per product first.
--
-- Everything else is unchanged — still SECURITY DEFINER, still no price
-- parameter, still bounded by real stock, still leaves stock untouched until
-- the order is marked paid.
--
-- Idempotent: safe to run more than once.
-- ============================================================

create or replace function public.place_whatsapp_order(
  items         jsonb,
  customer_name text,
  phone         text,
  address       jsonb default null,
  email         text default null
)
returns table (order_number bigint, total_cents int)
language plpgsql
security definer
set search_path = public
as $$
declare
  max_lines    constant int := 50;
  basket       jsonb;
  new_order_id uuid;
  computed     int;
  short_name   text;
  short_have   int;
  short_want   int;
begin
  -- ---------- shape ----------
  if items is null or jsonb_typeof(items) <> 'array' then
    raise exception 'No items in the order';
  end if;
  if jsonb_array_length(items) = 0 then
    raise exception 'No items in the order';
  end if;
  if jsonb_array_length(items) > max_lines then
    raise exception 'Too many different items in one order';
  end if;

  -- ---------- contact ----------
  if customer_name is null or btrim(customer_name) = '' then
    raise exception 'Please give a name';
  end if;
  if phone is null or btrim(phone) = '' then
    raise exception 'Please give a phone number';
  end if;

  -- ---------- resolve the basket ----------
  -- Prices come from the products row, never from the caller — there is no
  -- price parameter to this function. A piece that does not exist, is not
  -- listed, or has nothing left simply is not part of the order.
  --
  -- Grouped by product, so sending the same id on two lines cannot slip past
  -- the stock check by splitting the quantity.
  select jsonb_agg(x)
    into basket
    from (
      select jsonb_build_object(
               'product_id',       p.id,
               'name',             p.name,
               'unit_price_cents', p.price_cents,
               'quantity',         sum(greatest((i->>'quantity')::int, 1)),
               'stock_count',      p.stock_count
             ) as x
        from jsonb_array_elements(items) i
        join public.products p
          on p.id = (i->>'product_id')::uuid
         and p.is_active
         and p.stock_count > 0
       where (i->>'quantity')::int > 0
       group by p.id, p.name, p.price_cents, p.stock_count
    ) grouped;

  if basket is null or jsonb_array_length(basket) = 0 then
    raise exception 'None of those pieces are available';
  end if;

  -- ---------- nobody may order more than exists ----------
  -- Refused by name rather than silently reduced: quietly shipping two when
  -- someone asked for five is the worse surprise.
  select b->>'name', (b->>'stock_count')::int, (b->>'quantity')::int
    into short_name, short_have, short_want
    from jsonb_array_elements(basket) b
   where (b->>'quantity')::int > (b->>'stock_count')::int
   order by b->>'name'
   limit 1;

  if short_name is not null then
    raise exception 'Only % of "%" left — you asked for %',
      short_have, short_name, short_want;
  end if;

  select sum((b->>'unit_price_cents')::int * (b->>'quantity')::int)
    into computed
    from jsonb_array_elements(basket) b;

  -- ---------- write it ----------
  insert into public.orders (
    channel, status,
    contact_email, contact_phone, shipping_address,
    subtotal_cents, shipping_cents, total_cents, currency
  )
  values (
    'whatsapp', 'pending',
    nullif(btrim(coalesce(email, '')), ''),
    btrim(phone),
    coalesce(address, '{}'::jsonb) || jsonb_build_object('name', btrim(customer_name)),
    computed, 0, computed, 'INR'
  )
  returning id into new_order_id;

  insert into public.order_items (
    order_id, product_id, product_name, unit_price_cents, quantity
  )
  select
    new_order_id,
    (b->>'product_id')::uuid,
    b->>'name',
    (b->>'unit_price_cents')::int,
    (b->>'quantity')::int
  from jsonb_array_elements(basket) b;

  return query
    select o.order_number, o.total_cents
    from public.orders o
    where o.id = new_order_id;
end;
$$;

grant execute on function public.place_whatsapp_order(jsonb, text, text, jsonb, text)
  to anon, authenticated;
