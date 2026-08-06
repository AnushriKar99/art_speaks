-- ============================================================
-- WhatsApp orders, and moving stock deduction to confirmation.
--
-- Payment integration is deferred. In the meantime a customer builds a cart,
-- fills in their address, and the order is created here as `pending` while a
-- short WhatsApp message notifies the studio. The address travels through the
-- database rather than through message text, so nobody retypes a pincode.
--
-- Three things had to change for that to be safe.
--
--  1. `channel` allowed only 'online' and 'offline'.
--  2. The contact rule demanded an email. A WhatsApp customer gives a phone;
--     asking for an email as well is friction for no benefit.
--  3. Stock came off the moment line items were inserted. That is right for an
--     offline sale — it has already happened — but wrong for a WhatsApp order,
--     which is an intention. A customer who changes their mind would otherwise
--     leave your counts quietly wrong.
--
-- Stock now moves when an order is CONFIRMED, which is also the moment you
-- would physically set the pieces aside.
--
-- Idempotent: safe to run more than once.
-- ============================================================

-- ---------- 1. the third channel ----------
alter table public.orders drop constraint if exists orders_channel_check;
alter table public.orders
  add constraint orders_channel_check
  check (channel in ('online','offline','whatsapp'));

-- ---------- 2. reachable, not necessarily emailable ----------
-- An order you have to fulfil needs SOME way to contact the buyer. A walk-in
-- at a market needs neither, because they left with the item.
alter table public.orders drop constraint if exists orders_online_needs_email;
alter table public.orders
  add constraint orders_need_contact
  check (
    channel = 'offline'
    or contact_email is not null
    or contact_phone is not null
  );

-- ---------- 3. stock moves on confirmation ----------
-- Recorded on the order rather than inferred from status, so the deduction can
-- happen exactly once no matter how the status moves afterwards. Without this,
-- paid -> shipped -> paid would deduct twice.
alter table public.orders
  add column if not exists stock_deducted_at timestamptz;

-- An order created straight into 'paid' (an offline sale) still deducts as its
-- line items land — the sale already happened. A 'pending' order does not.
create or replace function public.decrement_stock()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  parent_status text;
  already       timestamptz;
begin
  if new.product_id is null then
    return new;
  end if;

  select status, stock_deducted_at
    into parent_status, already
    from public.orders
   where id = new.order_id;

  if parent_status in ('paid','shipped','delivered') and already is null then
    update public.products
       set stock_count = greatest(stock_count - new.quantity, 0)
     where id = new.product_id;
  end if;

  return new;
end;
$$;

-- Confirming a pending order is what reserves its stock.
create or replace function public.decrement_stock_on_confirm()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status in ('paid','shipped','delivered')
     and new.stock_deducted_at is null then

    -- Aggregated first: the same product can appear on more than one line, and
    -- a plain UPDATE ... FROM would apply only one of them.
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
  end if;

  return new;
end;
$$;

drop trigger if exists orders_decrement_stock_on_confirm on public.orders;
create trigger orders_decrement_stock_on_confirm
  before update on public.orders
  for each row execute function public.decrement_stock_on_confirm();

-- ---------- 4. offline sales stamp themselves as deducted ----------
-- Their stock came off via the order_items trigger above, so the confirmation
-- trigger must not do it again. Setting the column in the same UPDATE means the
-- BEFORE trigger sees it already populated and skips.
create or replace function public.record_offline_sale(
  items   jsonb,
  sold_on date default current_date,
  note    text default null
)
returns uuid
language plpgsql
security invoker
as $$
declare
  new_order_id uuid;
  total_cents  int;
begin
  if items is null or jsonb_array_length(items) = 0 then
    raise exception 'A sale needs at least one item';
  end if;

  select coalesce(sum((i->>'quantity')::int * (i->>'unit_price_cents')::int), 0)
    into total_cents
    from jsonb_array_elements(items) i;

  insert into public.orders (
    channel, status, contact_email,
    subtotal_cents, shipping_cents, total_cents, currency,
    created_at
  )
  values (
    'offline', 'paid', null,
    total_cents, 0, total_cents, 'INR',
    sold_on::timestamptz
  )
  returning id into new_order_id;

  insert into public.order_items (
    order_id, product_id, product_name, unit_price_cents, quantity
  )
  select
    new_order_id, p.id, p.name,
    (i->>'unit_price_cents')::int,
    (i->>'quantity')::int
  from jsonb_array_elements(items) i
  join public.products p on p.id = (i->>'product_id')::uuid
  where (i->>'quantity')::int > 0;

  if not exists (select 1 from public.order_items where order_id = new_order_id) then
    raise exception 'None of those products could be found';
  end if;

  update public.orders
     set stock_deducted_at = now()
   where id = new_order_id;

  return new_order_id;
end;
$$;

-- ---------- 5. admins manage order items ----------
-- 0003 gave admins select on order_items but no update or delete, so a
-- mis-tapped line on a market sale could not be corrected.
drop policy if exists "admins update order items" on public.order_items;
create policy "admins update order items"
  on public.order_items for update
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "admins delete order items" on public.order_items;
create policy "admins delete order items"
  on public.order_items for delete
  using (public.is_admin());
