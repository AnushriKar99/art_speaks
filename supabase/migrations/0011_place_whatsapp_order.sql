-- ============================================================
-- Placing an order from the shop.
--
-- A customer is not logged in and is not an admin, so RLS blocks them from
-- writing an order. There were three ways round that, and only one is safe.
--
--   Opening an anonymous INSERT policy would let anyone POST straight to the
--   REST API and write whatever they liked — an order for zero rupees, or ten
--   thousand junk rows — bypassing the checkout form entirely.
--
--   A secret key used server-side works, but bypasses RLS wholesale, so safety
--   rests on application code remembering to validate.
--
--   This function is SECURITY DEFINER: it runs with its owner's privileges, so
--   it can insert past RLS, but the public can only CALL it. There is no way to
--   write an arbitrary row. RLS on orders stays shut.
--
-- The important property: THE BROWSER CANNOT SET A PRICE. There is no price
-- parameter. Prices are read from products inside the transaction, so ordering
-- eight bookmarks for one rupee is not a bug to be caught — it is unexpressible.
--
-- Stock is NOT deducted here. The order is 'pending' until the studio marks it
-- paid, and 0010's trigger deducts then. An unpaid order reserves nothing.
--
-- Idempotent: safe to run more than once.
-- ============================================================

-- Quantities are bounded by real stock, not an arbitrary ceiling: you cannot
-- order more of something than exists. max_lines separately bounds how much
-- work a single call can cause.
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
  new_order_id uuid;
  computed     int;
  line_count   int;
  short_name   text;
  short_have   int;
  short_want   int;
begin
  -- ---------- shape ----------
  if items is null or jsonb_typeof(items) <> 'array' then
    raise exception 'No items in the order';
  end if;

  line_count := jsonb_array_length(items);
  if line_count = 0 then
    raise exception 'No items in the order';
  end if;
  if line_count > max_lines then
    raise exception 'Too many different items in one order';
  end if;

  -- ---------- contact ----------
  -- A phone number is required: it is how the studio replies. The orders table
  -- also enforces "email or phone" for any channel that has to be fulfilled.
  if customer_name is null or btrim(customer_name) = '' then
    raise exception 'Please give a name';
  end if;
  if phone is null or btrim(phone) = '' then
    raise exception 'Please give a phone number';
  end if;

  -- ---------- resolve the basket ----------
  -- Joined against products, so an id that does not exist, or a piece that is
  -- not listed or has nothing left, simply is not part of the order. The price
  -- is taken from the row, never from the caller.
  create temporary table if not exists _basket (
    product_id uuid,
    name text,
    unit_price_cents int,
    quantity int,
    stock_count int
  ) on commit drop;
  delete from _basket;

  insert into _basket (product_id, name, unit_price_cents, quantity, stock_count)
  select
    p.id,
    p.name,
    p.price_cents,
    greatest((i->>'quantity')::int, 1),
    p.stock_count
  from jsonb_array_elements(items) i
  join public.products p
    on p.id = (i->>'product_id')::uuid
   and p.is_active
   and p.stock_count > 0
  where (i->>'quantity')::int > 0;

  if not exists (select 1 from _basket) then
    raise exception 'None of those pieces are available';
  end if;

  -- ---------- nobody may order more than exists ----------
  -- Named rather than silently reduced: quietly shipping two when someone
  -- asked for five is a worse surprise than being told to adjust the basket.
  select name, stock_count, quantity
    into short_name, short_have, short_want
    from _basket
   where quantity > stock_count
   order by name
   limit 1;

  if short_name is not null then
    raise exception 'Only % of "%" left — you asked for %',
      short_have, short_name, short_want;
  end if;

  select sum(unit_price_cents * quantity) into computed from _basket;

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
    -- The name rides along in the address blob so it stays with the delivery
    -- details rather than being a column only this channel would ever use.
    coalesce(address, '{}'::jsonb) || jsonb_build_object('name', btrim(customer_name)),
    computed, 0, computed, 'INR'
  )
  returning id into new_order_id;

  insert into public.order_items (
    order_id, product_id, product_name, unit_price_cents, quantity
  )
  select new_order_id, product_id, name, unit_price_cents, quantity
  from _basket;

  return query
    select o.order_number, o.total_cents
    from public.orders o
    where o.id = new_order_id;
end;
$$;

-- Callable by shop visitors. This is the ONLY write into orders they can make.
grant execute on function public.place_whatsapp_order(jsonb, text, text, jsonb, text)
  to anon, authenticated;

-- ---------- try it ----------
--   select * from public.place_whatsapp_order(
--     '[{"product_id":"<uuid>","quantity":2}]'::jsonb,
--     'Test Person', '9123456789',
--     '{"line1":"1 Example Rd","city":"Kolkata","pincode":"700001"}'::jsonb
--   );
