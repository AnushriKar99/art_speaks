"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import type { CartItem } from "@/lib/data/cart";
import { formatPrice } from "@/lib/types";

/**
 * Client-side view of the basket. Quantity/remove act on local state only —
 * persistence and checkout land with the cart backend + Stripe.
 */
export function CartView({ initialItems }: { initialItems: CartItem[] }) {
  const [items, setItems] = useState(initialItems);

  const changeQuantity = (id: string, delta: number) =>
    setItems((prev) =>
      prev.map((item) =>
        item.product.id === id
          ? { ...item, quantity: Math.max(1, item.quantity + delta) }
          : item,
      ),
    );

  const removeItem = (id: string) =>
    setItems((prev) => prev.filter((item) => item.product.id !== id));

  const subtotalCents = items.reduce(
    (sum, item) => sum + item.product.priceCents * item.quantity,
    0,
  );

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
        {items.map(({ product, quantity }) => (
          <div
            key={product.id}
            className="bg-surface-container-lowest rounded-xl flex items-center gap-4 border border-outline-variant hover:border-primary transition-colors py-2 px-4"
          >
            <div className="relative w-16 h-16 flex-shrink-0 rounded-lg border border-outline-variant overflow-hidden bg-surface-container-low">
              <Image
                src={product.images[0]}
                alt={product.name}
                fill
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
              <div className="flex items-center gap-4 mt-3">
                <div className="flex items-center bg-secondary-container/30 rounded-full px-2 py-1 gap-4">
                  <button
                    className="w-6 h-6 flex items-center justify-center hover:text-primary transition-colors"
                    aria-label={`Decrease quantity of ${product.name}`}
                    onClick={() => changeQuantity(product.id, -1)}
                  >
                    <Icon name="remove" className="text-sm" />
                  </button>
                  <span className="font-label-caps text-label-caps">
                    {quantity}
                  </span>
                  <button
                    className="w-6 h-6 flex items-center justify-center hover:text-primary transition-colors"
                    aria-label={`Increase quantity of ${product.name}`}
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
                Calculated at next step
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
          {/* Checkout is not wired up yet (no cart backend / Stripe). */}
          <button className="w-full bg-candy-pink text-on-primary-container font-headline-md text-body-lg py-4 rounded-full candy-shadow hover:scale-[1.02] active:scale-95 transition-all duration-300 flex items-center justify-center gap-2">
            Proceed to Checkout
            <Icon name="arrow_forward" />
          </button>
          <p className="text-center font-label-caps text-secondary text-xs mt-4">
            * Final taxes calculated during secure checkout
          </p>
        </div>
      </section>
    </>
  );
}
