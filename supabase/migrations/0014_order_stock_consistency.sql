-- ============================================================
-- Two order/stock consistency fixes raised in review on PR #1.
--
-- 1. place_whatsapp_order silently drops lines
--
--    It joins on `p.is_active and p.stock_count > 0` and omits anything that
--    fails, but returned only the order number and total. The checkout page
--    fetched products with no such filter, so whenever a piece sold out or was
--    deactivated between add-to-cart and checkout the customer saw a three-way
--    mismatch: the summary listed the item, the total excluded it, and the
--    WhatsApp message told the studio to send it.
--
--    The function now returns the basket it actually wrote, so the confirmation
--    and the message can be rendered from what was recorded rather than from
--    what the browser hoped.
--
-- 2. Stock deduction was a one-way latch
--
--    stock_deducted_at correctly prevented double deduction, but nothing ever
--    restored units. Every mistaken "paid" click and every post-confirmation
--    cancellation permanently lowered the count, and because the order function
--    refuses lines with stock_count = 0, pieces physically sitting in the studio
--    would eventually become unorderable with no way back.
--
--    Leaving paid/shipped/delivered now restores what was taken.
--
-- Idempotent: safe to run more than once.
-- ============================================================

-- ---------- 1. return the resolved basket ----------
-- The return type changes, so the old signature has to go first.
drop function if exists public.place_whatsapp_order(jsonb, text, text, jsonb, text);

create function public.place_whatsapp_order(
  items         jsonb,
  customer_name text,
  phone         text,
  address       jsonb default null,
  email         text default null
)
returns table (order_number bigint, total_cents int, lines jsonb)
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
  if items is null or jsonb_typeof(items) <> 'array' then
    raise exception 'No items in the order';
  end if;
  if jsonb_array_length(items) = 0 then
    raise exception 'No items in the order';
  end if;
  if jsonb_array_length(items) > max_lines then
    raise exception 'Too many different items in one order';
  end if;

  if customer_name is null or btrim(customer_name) = '' then
    raise exception 'Please give a name';
  end if;
  if phone is null or btrim(phone) = '' then
    raise exception 'Please give a phone number';
  end if;

  -- Prices come from the products row; there is no price parameter, so a
  -- browser cannot set what something costs. Grouped by product, so sending
  -- the same id twice cannot slip past the stock check by splitting quantity.
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
    select o.order_number, o.total_cents,
           -- Only what was written. stock_count is dropped: it is an internal
           -- detail of the availability check, not something a customer needs.
           (select jsonb_agg(jsonb_build_object(
                     'name', b->>'name',
                     'quantity', (b->>'quantity')::int,
                     'unit_price_cents', (b->>'unit_price_cents')::int))
              from jsonb_array_elements(basket) b)
    from public.orders o
    where o.id = new_order_id;
end;
$$;

grant execute on function public.place_whatsapp_order(jsonb, text, text, jsonb, text)
  to anon, authenticated;

-- ---------- 2. give the latch a way back ----------
create or replace function public.decrement_stock_on_confirm()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  was_counted boolean := old.status in ('paid','shipped','delivered');
  is_counted  boolean := new.status in ('paid','shipped','delivered');
begin
  -- Becoming a sale: take the stock, once.
  if is_counted and new.stock_deducted_at is null then
    update public.products p
       set stock_count = greatest(p.stock_count - agg.qty, 0)
      from (
        select product_id, sum(quantity) as qty
          from public.order_items
         where order_id = new.id and product_id is not null
         group by product_id
      ) agg
     where p.id = agg.product_id;

    new.stock_deducted_at := now();

  -- Ceasing to be a sale: give it back, and clear the stamp so a later
  -- re-confirmation deducts again rather than silently doing nothing.
  elsif was_counted and not is_counted and old.stock_deducted_at is not null then
    update public.products p
       set stock_count = p.stock_count + agg.qty
      from (
        select product_id, sum(quantity) as qty
          from public.order_items
         where order_id = new.id and product_id is not null
         group by product_id
      ) agg
     where p.id = agg.product_id;

    new.stock_deducted_at := null;
  end if;

  return new;
end;
$$;

-- ---------- try it ----------
--   update public.orders set status = 'paid'      where order_number = 1004;  -- deducts
--   update public.orders set status = 'cancelled' where order_number = 1004;  -- restores
