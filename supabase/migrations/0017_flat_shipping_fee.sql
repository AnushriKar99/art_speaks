-- ============================================================
-- Charge a flat ₹80 shipping fee, computed here rather than trusted from the
-- browser.
--
-- orders.shipping_cents has existed since 0001 and was hardcoded to 0 —
-- shipping was settled by hand over WhatsApp, outside the recorded total. The
-- studio now wants a fixed fee shown up front, which means it has to be part
-- of what this function charges, not just a number the cart page prints.
--
-- Same reasoning CLAUDE.md already states for prices: nothing about what a
-- customer pays should be trustable from the client. The fee is a constant
-- inside this function, so a crafted request cannot claim its own shipping
-- cost any more than it can claim its own price.
--
-- shipping_cents is returned alongside the resolved lines, so the confirmation
-- screen and the WhatsApp message can show "Subtotal + Shipping = Total" built
-- from what the database actually charged — not recomputed client-side, which
-- is exactly the mismatch this schema has avoided everywhere else.
--
-- Idempotent: safe to run more than once.
-- ============================================================

drop function if exists public.place_whatsapp_order(jsonb, text, text, jsonb, text);

create function public.place_whatsapp_order(
  items         jsonb,
  customer_name text,
  phone         text,
  address       jsonb default null,
  email         text default null
)
returns table (
  order_number   bigint,
  subtotal_cents int,
  shipping_cents int,
  total_cents    int,
  lines          jsonb
)
language plpgsql
security definer
set search_path = public
as $$
declare
  max_lines      constant int := 50;
  -- ₹80. A named constant so the one call site raising it later is a search
  -- for this line, not a hunt through the function for a bare 8000.
  flat_shipping  constant int := 8000;
  basket         jsonb;
  new_order_id   uuid;
  subtotal       int;
  short_name     text;
  short_have     int;
  short_want     int;
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
  --
  -- Checked against raw stock_count only — two pending orders can both claim
  -- the last unit, and the second confirmation restores it. Accepted
  -- deliberately (2026-08-20, see docs/ROADMAP.md "Not doing"): pieces can be
  -- remade, so reserving stock at order time would refuse sales the studio
  -- would happily fulfil, for a race that is rare at this volume.
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
    into subtotal
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
    subtotal, flat_shipping, subtotal + flat_shipping, 'INR'
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
    select o.order_number, o.subtotal_cents, o.shipping_cents, o.total_cents,
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
