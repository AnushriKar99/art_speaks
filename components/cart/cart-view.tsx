"use client";

import { useEffect, useState } from "react";
import { ProductImage } from "@/components/ui/product-image";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { useCart } from "@/lib/cart/cart-store";
import { createClient } from "@/lib/supabase/client";
import { formatPrice, type Product } from "@/lib/types";

type Row = {
  id: string;
  slug: string;
  name: string;
  price_cents: number;
  currency: string;
  stock_count: number;
  images: string[] | null;
};

/**
 * The basket.
 *
 * The cart itself only remembers product ids and quantities; names, prices and
 * photos are fetched fresh here. A cart that cached prices would show — and
 * eventually charge — whatever something cost the day it was added.
 */
export function CartView() {
  const { lines, count, setQuantity, remove } = useCart();
  const [products, setProducts] = useState<Record<string, Product>>({});
  const [loaded, setLoaded] = useState(false);

  const ids = lines.map((l) => l.productId).sort().join(",");

  useEffect(() => {
    let cancelled = false;
    // Every setState below happens after an await, never synchronously in the
    // effect body — otherwise React warns about cascading renders.
    (async () => {
      if (!ids) {
        if (!cancelled) {
          setProducts({});
          setLoaded(true);
        }
        return;
      }
      const supabase = createClient();
      const { data } = await supabase
        .from("products")
        .select("id, slug, name, price_cents, currency, stock_count, images")
        .in("id", ids.split(","));
      if (cancelled) return;
      const map: Record<string, Product> = {};
      for (const r of (data ?? []) as Row[]) {
        map[r.id] = {
          id: r.id,
          slug: r.slug,
          name: r.name,
          priceCents: r.price_cents,
          currency: r.currency,
          stockCount: r.stock_count,
          images: r.images ?? [],
          description: "",
          artisanNote: "",
          categorySlug: "",
          isBestSeller: false,
          isNewArrival: false,
        };
      }
      setProducts(map);
      setLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [ids]);

  // Only lines whose product still resolves. A piece delisted since it was
  // added simply drops out rather than rendering as a blank row.
  /**
   * Quantities are capped at what actually exists before anything is shown.
   *
   * The stored basket is not trustworthy as a quantity: it is localStorage, so
   * it survives someone else buying the last two, and it can be edited by hand.
   * Rendering it unchecked meant a basket could claim 100 of something with
   * three in stock and total it up accordingly — a number the order would then
   * refuse, after the customer had filled in their address.
   *
   * The database refuses it regardless (place_whatsapp_order aggregates per
   * product and raises "Only 3 left — you asked for 100"). This is about not
   * showing a total that was never possible.
   */
  const items = lines
    .map((l) => {
      const product = products[l.productId];
      if (!product) return null;
      const stock = Math.max(product.stockCount, 0);
      return {
        product,
        quantity: Math.min(l.quantity, stock),
        // What the basket asked for, kept so the line can explain itself.
        requested: l.quantity,
        stock,
      };
    })
    .filter((i): i is NonNullable<typeof i> => i !== null);

  /**
   * Bounded at both ends.
   *
   * The floor was here; the ceiling was not, so + went past stock indefinitely
   * and the subtotal grew with it. The product card's stepper had the cap
   * (`atLimit` in add-to-cart-button) but the basket page never did.
   *
   * A basket can also arrive already over stock without any clicking — it
   * lives in localStorage, so it survives someone else buying the last two,
   * and it is editable by hand. So the clamp is against the product's current
   * stock, read fresh above, not against whatever the browser was holding.
   */
  const changeQuantity = (id: string, delta: number) => {
    const line = lines.find((l) => l.productId === id);
    if (!line) return;
    const stock = products[id]?.stockCount ?? 1;
    setQuantity(id, Math.min(Math.max(1, line.quantity + delta), Math.max(stock, 1)));
  };

  const removeItem = (id: string) => remove(id);

  const subtotalCents = items.reduce(
    (sum, item) => sum + item.product.priceCents * item.quantity,
    0,
  );

  if (!loaded && count > 0) {
    return (
      <p className="text-center py-20 text-body-md text-on-surface-variant">
        Loading your basket…
      </p>
    );
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-20">
        <Icon name="shopping_bag" className="text-6xl text-primary/40" />
        <p className="mt-4 text-body-lg text-on-surface-variant font-medium">
          Your basket is empty — go find a piece that speaks to you!
        </p>
        <Link
          href="/shop"
          className="inline-flex items-center gap-2 mt-8 bg-candy-pink text-on-primary-container font-headline-md text-body-md py-3 px-8 rounded-full candy-shadow hover:scale-[1.02] active:scale-95 transition-all duration-300"
        >
          Browse the shop
          <Icon name="arrow_forward" />
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-6">
        {items.map(({ product, quantity, requested, stock }) => (
          <div
            key={product.id}
            className="bg-surface-container-lowest rounded-xl flex items-center gap-4 border border-outline-variant hover:border-primary transition-colors py-2 px-4"
          >
            <div className="relative w-16 h-16 flex-shrink-0 rounded-lg border border-outline-variant overflow-hidden bg-surface-container-low">
              <ProductImage
                src={product.images[0]}
                alt={product.name}
                sizes="64px"
                className="object-cover"
              />
            </div>
            <div className="flex-grow">
              <h3 className="font-headline-md text-body-lg text-on-surface">
                {product.name}
              </h3>
              <p className="font-body-md text-primary font-bold mt-1">
                {formatPrice(product.priceCents, product.currency)}
              </p>
              {/* Only when the basket asked for more than exists — a stale
                  basket, or an edited one. Saying so here is the difference
                  between noticing now and being refused after typing an
                  address. */}
              {requested > quantity && (
                <p className="text-body-md text-error mt-1">
                  {stock === 0
                    ? "Sold out since you added it — remove it to check out."
                    : `Only ${stock} left, so we've reduced this from ${requested}.`}
                </p>
              )}
              <div className="flex items-center gap-4 mt-3">
                <div className="flex items-center bg-secondary-container/30 rounded-full px-2 py-1 gap-4">
                  <button
                    className="w-6 h-6 rounded-full flex items-center justify-center text-primary bg-primary-container/50 hover:bg-primary-container transition-colors"
                    aria-label={`Decrease quantity of ${product.name}`}
                    onClick={() => changeQuantity(product.id, -1)}
                  >
                    <Icon name="remove" className="text-sm" />
                  </button>
                  <span className="font-label-caps text-label-caps">
                    {quantity}
                  </span>
                  <button
                    className="w-6 h-6 rounded-full flex items-center justify-center text-primary bg-primary-container/50 hover:bg-primary-container transition-colors disabled:bg-transparent disabled:text-outline-variant disabled:opacity-60 disabled:cursor-not-allowed"
                    // Matches the product card's stepper, whose label the e2e
                    // suite already keys on.
                    aria-label={
                      quantity >= stock
                        ? `No more ${product.name} in stock`
                        : `Increase quantity of ${product.name}`
                    }
                    disabled={quantity >= stock}
                    title={quantity >= stock ? `Only ${stock} in stock` : undefined}
                    onClick={() => changeQuantity(product.id, 1)}
                  >
                    <Icon name="add" className="text-sm" />
                  </button>
                </div>
                <button
                  className="text-outline hover:text-error transition-colors flex items-center gap-1 text-sm font-label-caps"
                  onClick={() => removeItem(product.id)}
                >
                  <Icon name="delete" className="text-lg" />
                  Remove
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <section className="mt-12">
        <div className="bg-cream-bg p-6 relative overflow-hidden rounded-xl border border-primary/20 shadow-sm">
          <h3 className="font-headline-md text-headline-md text-primary mb-6">
            Order Summary
          </h3>
          <div className="space-y-4 border-b border-primary/10 pb-4 mb-4">
            <div className="flex justify-between items-center font-body-md">
              <span className="text-secondary text-xs font-label-caps uppercase tracking-wider">
                Subtotal
              </span>
              <span className="font-bold text-on-surface">
                {formatPrice(subtotalCents)}
              </span>
            </div>
            <div className="flex justify-between items-center font-body-md">
              <span className="text-secondary text-xs font-label-caps uppercase tracking-wider">
                Shipping
              </span>
              <span className="text-primary italic">
                Confirmed over WhatsApp
              </span>
            </div>
          </div>
          <div className="flex justify-between items-center mb-8">
            <span className="font-headline-md text-headline-md text-on-surface">
              Total
            </span>
            <span className="font-display-lg text-headline-md text-primary">
              {formatPrice(subtotalCents)}
            </span>
          </div>
          <Link
            href="/checkout"
            className="w-full bg-candy-pink text-on-primary-container font-headline-md text-body-lg py-4 rounded-full candy-shadow hover:scale-[1.02] active:scale-95 transition-all duration-300 flex items-center justify-center gap-2"
          >
            Place order
            <Icon name="arrow_forward" />
          </Link>
          <p className="text-center font-label-caps text-secondary text-xs mt-4">
            You will confirm the order over WhatsApp
          </p>
        </div>
      </section>
    </>
  );
}
