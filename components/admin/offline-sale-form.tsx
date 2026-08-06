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
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [soldOn, setSoldOn] = useState(today());
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) => p.name.toLowerCase().includes(q));
  }, [products, search]);

  const priceOf = (p: AdminProduct) => prices[p.id] ?? p.priceCents / 100;

  const lines: SaleLine[] = Object.entries(qty)
    .filter(([, n]) => n > 0)
    .map(([productId, quantity]) => {
      const p = products.find((x) => x.id === productId)!;
      return { productId, quantity, priceRupees: priceOf(p) };
    });

  const itemCount = lines.reduce((n, l) => n + l.quantity, 0);
  const totalRupees = lines.reduce((n, l) => n + l.quantity * l.priceRupees, 0);

  function bump(id: string, by: number) {
    setSaved(false);
    setQty((prev) => {
      const next = Math.max(0, (prev[id] ?? 0) + by);
      const copy = { ...prev };
      if (next === 0) delete copy[id];
      else copy[id] = next;
      return copy;
    });
  }

  function save() {
    setError(null);
    startTransition(async () => {
      const result = await recordOfflineSale(lines, soldOn);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setQty({});
      setPrices({});
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
          placeholder="Search pieces…"
          aria-label="Search pieces"
          className="flex-1 min-w-48 rounded-2xl border-2 border-outline-variant bg-white px-4 py-2 text-body-md focus:border-primary focus:outline-none"
        />
      </div>

      {/* Bottom padding clears the fixed total bar. */}
      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3 pb-40">
        {visible.map((p) => {
          const n = qty[p.id] ?? 0;
          const left = p.stockCount - n;
          return (
            <div key={p.id}>
              <button
                type="button"
                onClick={() => bump(p.id, 1)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  bump(p.id, -1);
                }}
                aria-label={`Add ${p.name}`}
                className={`squishy relative w-full aspect-square rounded-2xl overflow-hidden border-2 transition-colors ${
                  n > 0 ? "border-primary" : "border-candy-pink/30 hover:border-candy-pink"
                }`}
              >
                <ProductImage src={p.images[0]} alt={p.name} sizes="160px" className="object-cover" />
                {n > 0 && (
                  <span className="absolute -top-0 -right-0 m-1 bg-primary text-on-primary min-w-6 h-6 px-1.5 rounded-full text-body-md font-bold flex items-center justify-center border-2 border-surface-container-lowest">
                    {n}
                  </span>
                )}
              </button>

              <p className="text-[13px] text-on-surface mt-1 leading-tight line-clamp-2">{p.name}</p>
              <div className="flex items-center gap-1 text-[12px]">
                <span className="text-on-surface-variant">₹</span>
                <input
                  type="number"
                  min="0"
                  value={priceOf(p)}
                  onChange={(e) =>
                    setPrices((prev) => ({ ...prev, [p.id]: Number(e.target.value) }))
                  }
                  aria-label={`Price for ${p.name}`}
                  className="w-14 bg-transparent border-b border-outline-variant focus:border-primary outline-none text-on-surface"
                />
                <span className={left < 0 ? "text-error font-semibold" : "text-on-surface-variant"}>
                  · {left} left{left < 0 ? " ⚠" : ""}
                </span>
              </div>
              {n > 0 && (
                <button
                  type="button"
                  onClick={() => bump(p.id, -1)}
                  className="text-[12px] text-primary hover:underline mt-0.5"
                >
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
            disabled={pending || lines.length === 0}
            className="tactile-button rounded-2xl bg-primary text-on-primary font-headline-md px-6 py-3 text-body-lg disabled:opacity-50"
          >
            {pending ? "Saving…" : "Save sale"}
          </button>
        </div>
      </div>
    </>
  );
}
