"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { ProductImage } from "@/components/ui/product-image";
import { formatPrice } from "@/lib/types";
import { recordOfflineSale, type SaleLine } from "@/app/admin/(dashboard)/sales/actions";
import type { AdminProduct } from "@/lib/data/admin";

/** Local YYYY-MM-DD. toISOString() would shift the date across a timezone. */
function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function OfflineSaleForm({ products }: { products: AdminProduct[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [qty, setQty] = useState<Record<string, number>>({});
  const [soldOn, setSoldOn] = useState(today());
  const [search, setSearch] = useState("");
  /** Kept as the typed string so the box can be empty rather than showing 0. */
  const [extra, setExtra] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [capped, setCapped] = useState<string | null>(null);

  /**
   * Name or category, the way the storefront search works — search_products_
   * fuzzy (0008) scores the category name alongside the product name, so
   * "bookmarks" finds every bookmark there too. Matching only the name meant
   * the one search that gets used standing at a stall was the narrower of the
   * two: you had to remember what a piece was called to find it.
   *
   * The slug is matched as well as the display name, with its hyphens opened
   * out, so "worry stones" finds keychains-worry-stones.
   */
  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) =>
      [p.name, p.categoryName, p.categorySlug.replace(/-/g, " ")].some((field) =>
        field.toLowerCase().includes(q),
      ),
    );
  }, [products, search]);

  const priceOf = (p: AdminProduct) => p.priceCents / 100;

  const lines: SaleLine[] = Object.entries(qty)
    .filter(([, n]) => n > 0)
    .map(([productId, quantity]) => {
      const p = products.find((x) => x.id === productId)!;
      return { productId, quantity, priceRupees: priceOf(p) };
    });

  const itemCount = lines.reduce((n, l) => n + l.quantity, 0);
  const itemsRupees = lines.reduce((n, l) => n + l.quantity * l.priceRupees, 0);

  // A blank box is 0, and so is anything unparseable — Number("") is 0 and
  // Number("₹5") is NaN, neither of which should reach the total.
  const parsedExtra = Number(extra);
  const extraRupees =
    Number.isFinite(parsedExtra) && parsedExtra > 0 ? parsedExtra : 0;

  const totalRupees = itemsRupees + extraRupees;
  const canSave = lines.length > 0 || extraRupees > 0;

  /**
   * Never lets the tally exceed what is in stock. Recording a sale of five when
   * the system holds two produces a number you already know is wrong — the
   * place to fix that is the stock count in Inventory, not the sale.
   */
  function bump(id: string, by: number) {
    setSaved(false);
    const stock = products.find((p) => p.id === id)?.stockCount ?? 0;

    setQty((prev) => {
      const current = prev[id] ?? 0;
      const wanted = current + by;
      const next = Math.min(Math.max(0, wanted), stock);

      if (by > 0 && wanted > stock) {
        setCapped(id);
        window.setTimeout(() => setCapped((c) => (c === id ? null : c)), 2000);
      }

      const copy = { ...prev };
      if (next === 0) delete copy[id];
      else copy[id] = next;
      return copy;
    });
  }

  function save() {
    setError(null);
    startTransition(async () => {
      const result = await recordOfflineSale(lines, soldOn, extraRupees);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setQty({});
      setExtra("");
      setSaved(true);
      router.refresh(); // pull fresh stock counts
    });
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <label className="flex items-center gap-2 text-body-md text-on-surface-variant">
          <Icon name="event" className="text-[20px] text-primary" />
          <input
            type="date"
            value={soldOn}
            max={today()}
            onChange={(e) => setSoldOn(e.target.value)}
            className="rounded-2xl border-2 border-outline-variant bg-white px-3 py-2 text-body-md text-on-surface focus:border-primary focus:outline-none"
          />
        </label>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by piece or category…"
          aria-label="Search by piece or category"
          className="flex-1 min-w-48 rounded-2xl border-2 border-outline-variant bg-white px-4 py-2 text-body-md focus:border-primary focus:outline-none"
        />

        {/* Money taken for things the shop doesn't list. Sits with the other
            controls rather than in the total bar: it is something you set once
            at the end of a market, not per tap. */}
        <label className="flex items-center gap-2 rounded-2xl border-2 border-outline-variant bg-white px-3 py-2 focus-within:border-primary">
          <span className="text-body-md text-on-surface-variant whitespace-nowrap">
            Extra ₹
          </span>
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="1"
            value={extra}
            onChange={(e) => {
              setSaved(false);
              setExtra(e.target.value);
            }}
            placeholder="0"
            aria-label="Extra amount in rupees, for anything sold that isn't listed"
            className="w-20 bg-transparent text-body-md text-on-surface focus:outline-none"
          />
        </label>
      </div>

      <p className="text-[12px] text-on-surface-variant mb-4 -mt-2">
        Extra covers anything sold that isn&rsquo;t listed here. It joins the
        day&rsquo;s takings; no stock comes down for it.
      </p>

      {/* Bottom padding clears the fixed total bar. */}
      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3 pb-40">
        {visible.map((p) => {
          const n = qty[p.id] ?? 0;
          const left = p.stockCount - n;
          const soldOut = p.stockCount === 0;
          const atLimit = n >= p.stockCount;
          return (
            <div key={p.id} className={soldOut ? "opacity-50" : undefined}>
              <button
                type="button"
                disabled={soldOut}
                onClick={() => bump(p.id, 1)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  bump(p.id, -1);
                }}
                aria-label={
                  soldOut ? `${p.name} — none in stock` : `Add ${p.name}`
                }
                className={`squishy relative w-full aspect-square rounded-2xl overflow-hidden border-2 transition-colors disabled:cursor-not-allowed ${
                  capped === p.id
                    ? "border-error"
                    : n > 0
                      ? "border-primary"
                      : "border-candy-pink/30 hover:border-candy-pink"
                }`}
              >
                <ProductImage src={p.images[0]} alt={p.name} sizes="160px" className="object-cover" />
                {n > 0 && (
                  <span className="absolute -top-0 -right-0 m-1 bg-primary text-on-primary min-w-6 h-6 px-1.5 rounded-full text-body-md font-bold flex items-center justify-center border-2 border-surface-container-lowest">
                    {n}
                  </span>
                )}
              </button>

              <p className="text-[13px] text-on-surface mt-1 leading-tight line-clamp-2">
                {p.name}
              </p>
              <p className="text-[12px] text-on-surface-variant">
                {formatPrice(p.priceCents, p.currency)}
                {" · "}
                {soldOut ? (
                  <span className="text-error">none left</span>
                ) : (
                  <span className={atLimit ? "text-error" : undefined}>
                    {left} left
                  </span>
                )}
              </p>
              {capped === p.id && (
                <p className="text-[12px] text-error" role="status">
                  Only {p.stockCount} in stock
                </p>
              )}
              {n > 0 && (
                // Was 12px plain text with only an underline on hover, which
                // disappeared against the tile — easy to miss standing at a
                // stall, which is the one place this gets used. Now a bordered
                // pill: it reads as a control before you touch it, and the
                // target is big enough for a thumb.
                <button
                  type="button"
                  onClick={() => bump(p.id, -1)}
                  className="mt-1 inline-flex items-center gap-1 rounded-full border-2 border-primary/40 bg-surface-container-lowest px-2.5 py-1 text-[12px] font-bold text-primary hover:border-primary hover:bg-primary-container/40 active:scale-95 transition-all"
                >
                  <Icon name="remove" className="text-[14px]" />
                  Remove one
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Fixed bar so the total and Save stay reachable while scrolling a long grid. */}
      <div className="fixed bottom-16 lg:bottom-0 left-0 w-full bg-surface-container-lowest border-t-2 border-candy-pink/40 shadow-[0_-4px_12px_rgba(255,183,206,0.15)] z-40">
        <div className="max-w-container-max mx-auto px-margin-mobile lg:px-margin-desktop py-3 flex items-center gap-4">
          <div className="flex-1">
            {error && (
              <p className="text-body-md text-error" role="alert">
                {error}
              </p>
            )}
            {saved && !error && (
              <p className="text-body-md text-secondary" role="status">
                Sale recorded — stock updated.
              </p>
            )}
            {!error && !saved && (
              <>
                <p className="text-[13px] text-on-surface-variant leading-none">
                  {itemCount} {itemCount === 1 ? "item" : "items"}
                  {extraRupees > 0 && (
                    <>
                      {" · "}
                      {formatPrice(Math.round(extraRupees * 100))} extra
                    </>
                  )}
                </p>
                <p className="font-headline-md text-headline-md text-primary leading-tight">
                  {formatPrice(Math.round(totalRupees * 100))}
                </p>
              </>
            )}
          </div>
          <button
            type="button"
            onClick={save}
            disabled={pending || !canSave}
            className="tactile-button rounded-2xl bg-primary text-on-primary font-headline-md px-6 py-3 text-body-lg disabled:opacity-50"
          >
            {pending ? "Saving…" : "Save sale"}
          </button>
        </div>
      </div>
    </>
  );
}
