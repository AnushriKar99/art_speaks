-- ============================================================
-- 0026_inventory_lock_flow.sql
-- 30-minute atomic inventory lock flow for WhatsApp orders.
--
-- 1. Schema:
--    Add stock_locked_at, expires_at, stock_restored_at, and admin_notes
--    to public.orders.
--
-- 2. Trigger Function public.handle_order_status_stock_transition():
--    Replaces decrement_stock_on_confirm.
--    - When status moves to paid/shipped/delivered:
--      * If order was already locked at placement (stock_locked_at IS NOT NULL),
--        stock was already decremented upon checkout; finalize by setting
--        stock_deducted_at = now() and clearing expires_at.
--      * If order was not locked, decrement product stock now and stamp
--        stock_deducted_at = now().
--    - When status moves to cancelled:
--      * If stock was locked or deducted, and has NOT yet been restored
--        (stock_restored_at IS NULL), increment product stock_count back
--        and stamp stock_restored_at = now(). Idempotent.
--    - When status is reverted back to pending from cancelled:
--      * Re-lock: decrement stock again and start a fresh 30-minute window.
--
-- 3. Expiration function public.release_expired_order_locks():
--    Cancels pending orders whose 30-minute window (expires_at) has passed,
--    restoring their stock and stamping admin_notes.
--
-- 4. place_whatsapp_order():
--    - Runs release_expired_order_locks() to free stale stock.
--    - Locks product rows with FOR UPDATE to prevent race conditions.
--    - Checks stock availability.
--    - Inserts order with 30-minute lock window (expires_at = now() + 30 mins).
--    - Atomically decrements stock immediately.
--    - Returns expires_at along with order details.
--
-- Idempotent: safe to run multiple times.
-- ============================================================

-- ---------- 1. schema extensions ----------
alter table public.orders
  add column if not exists stock_locked_at timestamptz,
  add column if not exists expires_at timestamptz,
  add column if not exists stock_restored_at timestamptz,
  add column if not exists admin_notes text;

create index if not exists orders_expires_at_idx on public.orders (expires_at)
  where status = 'pending' and expires_at is not null;

-- ---------- 2. status transition trigger function ----------
create or replace function public.handle_order_status_stock_transition()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  was_counted boolean := old.status in ('paid','shipped','delivered');
  is_counted  boolean := new.status in ('paid','shipped','delivered');
  was_locked  boolean := (old.status = 'pending' and old.stock_locked_at is not null);
begin
  -- Case A: Confirming as sale (paid / shipped / delivered)
  if is_counted then
    if was_locked and new.stock_deducted_at is null then
      -- Stock was already decremented when order was placed.
      -- Finalize the lock into permanent deduction.
      new.stock_deducted_at := now();
      new.expires_at := null;
    elsif not was_counted and new.stock_deducted_at is null then
      -- Offline or unreserved order moving to paid: decrement now
      update public.products p
         set stock_count = greatest(p.stock_count - agg.qty, 0),
             updated_at = now()
        from (
          select product_id, sum(quantity) as qty
            from public.order_items
           where order_id = new.id and product_id is not null
           group by product_id
        ) agg
       where p.id = agg.product_id;

      new.stock_deducted_at := now();
      new.expires_at := null;
    end if;

  -- Case B: Cancelling the order
  elsif new.status = 'cancelled' then
    -- If stock was deducted or currently locked, and has NOT yet been restored
    if (was_locked or old.stock_deducted_at is not null) and old.stock_restored_at is null then
      update public.products p
         set stock_count = p.stock_count + agg.qty,
             updated_at = now()
        from (
          select product_id, sum(quantity) as qty
            from public.order_items
           where order_id = new.id and product_id is not null
           group by product_id
        ) agg
       where p.id = agg.product_id;

      new.stock_restored_at := now();
      new.stock_locked_at   := null;
      new.stock_deducted_at := null;
      new.expires_at        := null;
    end if;

  -- Case C: Reverting from cancelled back to pending
  elsif old.status = 'cancelled' and new.status = 'pending' then
    -- If stock was previously restored on cancellation, re-reserve it
    if old.stock_restored_at is not null then
      update public.products p
         set stock_count = greatest(p.stock_count - agg.qty, 0),
             updated_at = now()
        from (
          select product_id, sum(quantity) as qty
            from public.order_items
           where order_id = new.id and product_id is not null
           group by product_id
        ) agg
       where p.id = agg.product_id;
    end if;

    new.stock_restored_at := null;
    new.stock_deducted_at := null;
    new.stock_locked_at   := now();
    new.expires_at        := now() + interval '30 minutes';

  -- Case D: Reverting from paid/shipped/delivered back to pending
  elsif was_counted and new.status = 'pending' then
    -- Stock was already deducted, keep it held under the 30-minute lock
    new.stock_deducted_at := null;
    new.stock_restored_at := null;
    new.stock_locked_at   := now();
    new.expires_at        := now() + interval '30 minutes';
  end if;

  return new;
end;
$$;

-- Replace old trigger with new transition trigger
drop trigger if exists orders_decrement_stock_on_confirm on public.orders;
drop trigger if exists orders_stock_status_transition on public.orders;

create trigger orders_stock_status_transition
  before update on public.orders
  for each row execute function public.handle_order_status_stock_transition();

-- ---------- 3. release expired locks function ----------
create or replace function public.release_expired_order_locks()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  expired_order record;
  reclaimed_count integer := 0;
begin
  for expired_order in
    select id, order_number
      from public.orders
     where status = 'pending'
       and expires_at is not null
       and expires_at < now()
     for update skip locked
  loop
    -- Updating status to cancelled fires orders_stock_status_transition trigger,
    -- which safely restores product stock and stamps stock_restored_at.
    update public.orders
       set status = 'cancelled',
           admin_notes = coalesce(admin_notes || ' | ', '') || 'Auto-expired: 30-minute reservation elapsed without confirmation. Stock restored.',
           updated_at = now()
     where id = expired_order.id;

    reclaimed_count := reclaimed_count + 1;
  end loop;

  return reclaimed_count;
end;
$$;

grant execute on function public.release_expired_order_locks() to anon, authenticated;

-- ---------- 4. atomic place_whatsapp_order with 30-minute lock ----------
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
  lines          jsonb,
  expires_at     timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  max_lines      constant int := 50;
  flat_shipping  constant int := 8000; -- ₹80 flat shipping
  basket         jsonb;
  new_order_id   uuid;
  order_expires  timestamptz;
  subtotal       int;
  short_name     text;
  short_have     int;
  short_want     int;
begin
  -- 1. Free any stale locks first so inventory reflects reality
  perform public.release_expired_order_locks();

  -- 2. Input validation
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

  -- 3. Row-level lock on candidate products to prevent concurrent race conditions
  perform 1
     from public.products
    where id in (
      select distinct (i->>'product_id')::uuid
        from jsonb_array_elements(items) i
       where (i->>'quantity')::int > 0
    )
    for update;

  -- 4. Group basket items and resolve live prices & stock
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

  -- 5. Availability check
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

  -- 6. Calculate totals
  select sum((b->>'unit_price_cents')::int * (b->>'quantity')::int)
    into subtotal
    from jsonb_array_elements(basket) b;

  order_expires := now() + interval '30 minutes';

  -- 7. Insert order with 30-minute lock window
  insert into public.orders (
    channel, status,
    contact_email, contact_phone, shipping_address,
    subtotal_cents, shipping_cents, total_cents, currency,
    stock_locked_at, expires_at
  )
  values (
    'whatsapp', 'pending',
    nullif(btrim(coalesce(email, '')), ''),
    btrim(phone),
    coalesce(address, '{}'::jsonb) || jsonb_build_object('name', btrim(customer_name)),
    subtotal, flat_shipping, subtotal + flat_shipping, 'INR',
    now(), order_expires
  )
  returning id into new_order_id;

  -- 8. Insert line items
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

  -- 9. Atomically decrement reserved stock immediately
  update public.products p
     set stock_count = greatest(p.stock_count - (b->>'quantity')::int, 0),
         updated_at = now()
    from jsonb_array_elements(basket) b
   where p.id = (b->>'product_id')::uuid;

  -- 10. Return order details including expires_at
  return query
    select o.order_number, o.subtotal_cents, o.shipping_cents, o.total_cents,
           (select jsonb_agg(jsonb_build_object(
                     'name', b->>'name',
                     'quantity', (b->>'quantity')::int,
                     'unit_price_cents', (b->>'unit_price_cents')::int))
              from jsonb_array_elements(basket) b),
           o.expires_at
    from public.orders o
    where o.id = new_order_id;
end;
$$;

grant execute on function public.place_whatsapp_order(jsonb, text, text, jsonb, text)
  to anon, authenticated;
