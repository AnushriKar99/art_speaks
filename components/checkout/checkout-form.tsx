"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useCart } from "@/lib/cart/cart-store";
import { createClient } from "@/lib/supabase/client";
import { buildWhatsAppLink } from "@/lib/contact";
import { formatPrice } from "@/lib/types";
import { Icon } from "@/components/ui/icon";

const field =
  "w-full rounded-2xl border-2 border-outline-variant bg-white px-4 py-3 text-body-md text-on-surface focus:border-primary focus:outline-none";
const label =
  "block text-label-caps font-label-caps uppercase tracking-wide text-on-surface-variant mb-1.5";

type Line = { id: string; name: string; priceCents: number; quantity: number };
/** What the server actually recorded — not what the browser had in the basket. */
type PlacedLine = { name: string; quantity: number; unit_price_cents: number };
type Placed = {
  orderNumber: number;
  totalCents: number;
  lines: PlacedLine[];
  /** Lines the browser showed that the order did not include. */
  dropped: string[];
  link: string;
};

export function CheckoutForm() {
  const { lines, clear } = useCart();
  const [items, setItems] = useState<Line[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [placed, setPlaced] = useState<Placed | null>(null);

  const ids = lines.map((l) => l.productId).sort().join(",");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!ids) {
        if (!cancelled) {
          setItems([]);
          setLoaded(true);
        }
        return;
      }
      const supabase = createClient();
      const { data } = await supabase
        .from("products")
        .select("id, name, price_cents")
        .in("id", ids.split(","));
      if (cancelled) return;
      const byId = new Map(
        (data ?? []).map((p) => [p.id as string, p as { id: string; name: string; price_cents: number }]),
      );
      setItems(
        lines
          .map((l) => {
            const p = byId.get(l.productId);
            return p
              ? { id: p.id, name: p.name, priceCents: p.price_cents, quantity: l.quantity }
              : null;
          })
          .filter((x): x is Line => x !== null),
      );
      setLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids]);

  const totalCents = items.reduce((n, i) => n + i.priceCents * i.quantity, 0);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);

    const form = new FormData(e.currentTarget);
    const name = String(form.get("name") ?? "");
    const phone = String(form.get("phone") ?? "");

    const supabase = createClient();
    const { data, error: rpcError } = await supabase.rpc("place_whatsapp_order", {
      // Only ids and quantities. The price is read from the database inside the
      // function — there is no parameter through which one could be sent.
      items: lines.map((l) => ({
        product_id: l.productId,
        quantity: l.quantity,
      })),
      customer_name: name,
      phone,
      email: String(form.get("email") ?? "") || null,
      address: {
        line1: String(form.get("line1") ?? ""),
        line2: String(form.get("line2") ?? ""),
        city: String(form.get("city") ?? ""),
        state: String(form.get("state") ?? ""),
        pincode: String(form.get("pincode") ?? ""),
      },
    });

    setPending(false);

    if (rpcError) {
      setError(rpcError.message);
      return;
    }

    const row = (
      data as {
        order_number: number;
        total_cents: number;
        lines: PlacedLine[] | null;
      }[]
    )?.[0];
    if (!row) {
      setError("Something went wrong placing the order. Please try again.");
      return;
    }

    // Render from what the order actually contains, never from the basket.
    // place_whatsapp_order omits anything that sold out or was delisted
    // between add-to-cart and checkout — showing the browser's version would
    // list an item the total excludes and tell the studio to send it.
    const placedLines = row.lines ?? [];
    const placedNames = new Set(placedLines.map((l) => l.name));
    const dropped = items
      .map((i) => i.name)
      .filter((name) => !placedNames.has(name));

    const message = [
      `Hi! I'd like to order #${row.order_number}`,
      "",
      ...placedLines.map((l) => `• ${l.quantity} × ${l.name}`),
      "",
      `Total: ${formatPrice(row.total_cents)}`,
      `Name: ${name}`,
    ].join("\n");

    // The basket is now recorded server-side, so clearing it cannot lose
    // anything — and leaving it would let a refresh place a duplicate order.
    clear();
    setPlaced({
      orderNumber: row.order_number,
      totalCents: row.total_cents,
      lines: placedLines,
      dropped,
      link: buildWhatsAppLink(message),
    });
  }

  // ---------- after placing ----------
  if (placed) {
    return (
      <div className="max-w-md mx-auto text-center rounded-[2rem] border-2 border-candy-pink/30 bg-surface-container-lowest p-8">
        <p className="text-4xl mb-3">🎀</p>
        <h2 className="font-headline-md text-headline-md text-primary mb-1">
          Order #{placed.orderNumber} received
        </h2>
        <p className="text-body-md text-on-surface-variant mb-4">
          Send the message below and we&apos;ll confirm your order and share
          payment details.
        </p>

        {/* What was recorded, itemised — so the list and the total agree. */}
        <ul className="text-left text-body-md border-y border-outline-variant/60 py-3 mb-4 space-y-1">
          {placed.lines.map((l) => (
            <li key={l.name} className="flex justify-between gap-3">
              <span className="text-on-surface">
                {l.quantity} × {l.name}
              </span>
              <span className="text-on-surface-variant whitespace-nowrap">
                {formatPrice(l.unit_price_cents * l.quantity)}
              </span>
            </li>
          ))}
          <li className="flex justify-between gap-3 pt-1 font-headline-md text-primary">
            <span>Total</span>
            <span>{formatPrice(placed.totalCents)}</span>
          </li>
        </ul>

        {/* Said plainly rather than left to be noticed: a piece can sell out
            between adding it and checking out, and quietly shipping a shorter
            order than the customer asked for is the worse surprise. */}
        {placed.dropped.length > 0 && (
          <p
            className="text-body-md text-on-surface-variant bg-lemon-yellow/40 rounded-2xl px-4 py-3 mb-4 text-left"
            role="status"
          >
            {placed.dropped.length === 1
              ? `${placed.dropped[0]} sold out while you were ordering, so it isn't included.`
              : `${placed.dropped.join(", ")} sold out while you were ordering, so they aren't included.`}{" "}
            Message us if you&apos;d like one made.
          </p>
        )}
        <a
          href={placed.link}
          target="_blank"
          rel="noopener noreferrer"
          className="tactile-button inline-flex items-center gap-2 rounded-2xl bg-primary text-on-primary font-headline-md px-6 py-3 text-body-lg"
        >
          <Icon name="chat" />
          Send on WhatsApp
        </a>
        <p className="text-body-md text-on-surface-variant mt-6">
          <Link href="/shop" className="underline hover:text-primary">
            Back to the shop
          </Link>
        </p>
      </div>
    );
  }

  if (!loaded) {
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
        <p className="mt-4 text-body-lg text-on-surface-variant">
          There is nothing in your basket yet.
        </p>
        <Link
          href="/shop"
          className="inline-flex items-center gap-2 mt-8 bg-candy-pink text-on-primary-container font-headline-md text-body-md py-3 px-8 rounded-full candy-shadow"
        >
          Browse the shop
          <Icon name="arrow_forward" />
        </Link>
      </div>
    );
  }

  // ---------- the form ----------
  return (
    <form onSubmit={handleSubmit} className="grid lg:grid-cols-[1fr_20rem] gap-8 items-start">
      <div className="space-y-6">
        <section className="rounded-[2rem] border-2 border-candy-pink/30 bg-surface-container-lowest p-6 space-y-5">
          <h2 className="font-headline-md text-headline-md text-primary">
            Where should it go?
          </h2>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className={label} htmlFor="name">Name</label>
              <input id="name" name="name" required autoComplete="name" className={field} />
            </div>
            <div>
              <label className={label} htmlFor="phone">WhatsApp number</label>
              <input
                id="phone"
                name="phone"
                required
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="10-digit mobile"
                className={field}
              />
            </div>
          </div>

          <div>
            <label className={label} htmlFor="line1">Address</label>
            <input id="line1" name="line1" required autoComplete="address-line1" className={field} />
          </div>
          <div>
            <label className={label} htmlFor="line2">
              Apartment, landmark <span className="normal-case tracking-normal">(optional)</span>
            </label>
            <input id="line2" name="line2" autoComplete="address-line2" className={field} />
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <label className={label} htmlFor="city">City</label>
              <input id="city" name="city" required autoComplete="address-level2" className={field} />
            </div>
            <div>
              <label className={label} htmlFor="state">State</label>
              <input id="state" name="state" required autoComplete="address-level1" className={field} />
            </div>
            <div>
              <label className={label} htmlFor="pincode">Pincode</label>
              <input
                id="pincode"
                name="pincode"
                required
                inputMode="numeric"
                pattern="[0-9]{6}"
                title="Six digits"
                autoComplete="postal-code"
                className={field}
              />
            </div>
          </div>

          <div>
            <label className={label} htmlFor="email">
              Email <span className="normal-case tracking-normal">(optional)</span>
            </label>
            <input id="email" name="email" type="email" autoComplete="email" className={field} />
          </div>
        </section>
      </div>

      {/* summary */}
      <aside className="rounded-[2rem] border-2 border-candy-pink/30 bg-cream-bg p-6 lg:sticky lg:top-24">
        <h2 className="font-headline-md text-headline-md text-primary mb-4">
          Your order
        </h2>
        <ul className="space-y-2 mb-4">
          {items.map((i) => (
            <li key={i.id} className="flex justify-between gap-3 text-body-md">
              <span className="text-on-surface">
                {i.quantity} × {i.name}
              </span>
              <span className="text-on-surface-variant whitespace-nowrap">
                {formatPrice(i.priceCents * i.quantity)}
              </span>
            </li>
          ))}
        </ul>
        <div className="flex justify-between items-center border-t border-primary/10 pt-4 mb-6">
          <span className="font-headline-md text-body-lg text-on-surface">Total</span>
          <span className="font-headline-md text-headline-md text-primary">
            {formatPrice(totalCents)}
          </span>
        </div>

        {error && (
          <p className="text-body-md text-error bg-error-container/50 rounded-2xl px-4 py-3 mb-4" role="alert">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="tactile-button w-full rounded-2xl bg-primary text-on-primary font-headline-md py-3 text-body-lg disabled:opacity-60"
        >
          {pending ? "Placing…" : "Place order"}
        </button>
        <p className="text-[13px] text-on-surface-variant text-center mt-3">
          No payment now. We confirm on WhatsApp and share payment details.
        </p>
      </aside>
    </form>
  );
}
