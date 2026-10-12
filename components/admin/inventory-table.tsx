"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { AdminProduct } from "@/lib/data/admin";
import { formatPrice } from "@/lib/types";
import { Icon } from "@/components/ui/icon";

const LOW_STOCK = 3;

function StockPill({ count }: { count: number }) {
  const tone =
    count === 0
      ? "bg-error-container text-on-error-container"
      : count <= LOW_STOCK
        ? "bg-lemon-yellow text-on-tertiary-container"
        : "bg-secondary-container text-on-secondary-container";
  return (
    <span
      className={`inline-flex items-center justify-center min-w-9 px-2 py-0.5 rounded-full text-body-md font-semibold ${tone}`}
    >
      {count}
    </span>
  );
}

type StatusFilter = "all" | "live" | "hidden";

export function InventoryTable({ products }: { products: AdminProduct[] }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const liveCount = useMemo(
    () => products.filter((p) => p.isActive).length,
    [products],
  );
  const hiddenCount = useMemo(
    () => products.filter((p) => !p.isActive).length,
    [products],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    return products.filter((p) => {
      // 1. Status filter (Live vs Hidden)
      if (statusFilter === "live" && !p.isActive) return false;
      if (statusFilter === "hidden" && p.isActive) return false;

      // 2. Search query (Product name, category name, or slug)
      if (!q) return true;

      const candidates = [
        p.name,
        p.slug.replace(/-/g, " "),
        p.categoryName,
        p.categorySlug.replace(/-/g, " "),
      ];

      return candidates.some((c) => c.toLowerCase().includes(q));
    });
  }, [products, search, statusFilter]);

  const isFiltered = search.trim().length > 0 || statusFilter !== "all";

  return (
    <div className="space-y-4">
      {/* Controls Bar: Search on side, Filter tabs on other side */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Search Bar */}
        <div className="relative flex-1 max-w-md">
          <Icon
            name="search"
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-outline pointer-events-none text-[20px]"
          />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search piece or category…"
            aria-label="Search by piece or category"
            className="w-full rounded-2xl border-2 border-outline-variant bg-white pl-10 pr-10 py-2.5 text-body-md focus:border-primary focus:outline-none transition-colors"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-outline hover:text-on-surface"
              aria-label="Clear search"
            >
              <Icon name="close" className="text-[18px]" />
            </button>
          )}
        </div>

        {/* Status Filter Options: All / Live / Hidden */}
        <div
          role="tablist"
          aria-label="Filter products by status"
          className="flex flex-wrap items-center gap-2"
        >
          <button
            type="button"
            role="tab"
            aria-selected={statusFilter === "all"}
            onClick={() => setStatusFilter("all")}
            className={
              statusFilter === "all"
                ? "rounded-full bg-primary text-on-primary font-headline-md px-4 py-2 text-body-md"
                : "rounded-full border-2 border-outline-variant px-4 py-2 text-body-md text-on-surface-variant hover:border-primary hover:text-primary transition-colors"
            }
          >
            All
            <span
              className={
                statusFilter === "all" ? "ml-2 opacity-80" : "ml-2 text-outline"
              }
            >
              {products.length}
            </span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={statusFilter === "live"}
            onClick={() => setStatusFilter("live")}
            className={
              statusFilter === "live"
                ? "rounded-full bg-primary text-on-primary font-headline-md px-4 py-2 text-body-md"
                : "rounded-full border-2 border-outline-variant px-4 py-2 text-body-md text-on-surface-variant hover:border-primary hover:text-primary transition-colors"
            }
          >
            Live
            <span
              className={
                statusFilter === "live" ? "ml-2 opacity-80" : "ml-2 text-outline"
              }
            >
              {liveCount}
            </span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={statusFilter === "hidden"}
            onClick={() => setStatusFilter("hidden")}
            className={
              statusFilter === "hidden"
                ? "rounded-full bg-primary text-on-primary font-headline-md px-4 py-2 text-body-md"
                : "rounded-full border-2 border-outline-variant px-4 py-2 text-body-md text-on-surface-variant hover:border-primary hover:text-primary transition-colors"
            }
          >
            Hidden
            <span
              className={
                statusFilter === "hidden"
                  ? "ml-2 opacity-80"
                  : "ml-2 text-outline"
              }
            >
              {hiddenCount}
            </span>
          </button>
        </div>
      </div>

      {/* Filter Info / Reset shortcut */}
      {isFiltered && (
        <div className="flex items-center justify-between text-body-md text-on-surface-variant px-1">
          <span>
            Showing <strong className="text-on-surface">{filtered.length}</strong>{" "}
            of {products.length} {products.length === 1 ? "piece" : "pieces"}
          </span>
          <button
            type="button"
            onClick={() => {
              setSearch("");
              setStatusFilter("all");
            }}
            className="text-primary hover:underline text-body-md"
          >
            Reset filters
          </button>
        </div>
      )}

      {/* Table or Empty Results */}
      {filtered.length === 0 ? (
        <div className="rounded-[2rem] border-2 border-dashed border-outline-variant bg-surface-container-low/60 p-10 text-center">
          <Icon name="search_off" className="text-[40px] text-outline" />
          <p className="text-body-md text-on-surface mt-3 font-semibold">
            No matching pieces found
          </p>
          <p className="text-body-md text-on-surface-variant mt-1">
            {search
              ? `No products matching “${search}” with the current filter.`
              : "No products in this filter category."}
          </p>
          <button
            type="button"
            onClick={() => {
              setSearch("");
              setStatusFilter("all");
            }}
            className="inline-block mt-4 text-primary font-label-caps text-label-caps uppercase tracking-wider hover:underline"
          >
            Clear search & filters
          </button>
        </div>
      ) : (
        <div className="rounded-[2rem] border-2 border-candy-pink/30 bg-surface-container-lowest overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[46rem]">
              <thead>
                <tr className="bg-surface-container-high text-on-surface-variant">
                  <th className="font-label-caps text-label-caps uppercase tracking-wide px-4 py-3">
                    Piece
                  </th>
                  <th className="font-label-caps text-label-caps uppercase tracking-wide px-4 py-3">
                    Category
                  </th>
                  <th className="font-label-caps text-label-caps uppercase tracking-wide px-4 py-3 text-right">
                    Price
                  </th>
                  <th className="font-label-caps text-label-caps uppercase tracking-wide px-4 py-3 text-center">
                    Stock
                  </th>
                  <th className="font-label-caps text-label-caps uppercase tracking-wide px-4 py-3">
                    Shows as
                  </th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr
                    key={p.id}
                    className="border-t border-outline-variant/60 hover:bg-surface-container-low transition-colors"
                  >
                    <td className="px-4 py-3">
                      <span className="text-body-md text-on-surface font-medium">
                        {p.name}
                      </span>
                      {p.images.length === 0 && (
                        <span
                          className="ml-2 text-body-md"
                          title="No photo yet — shows a placeholder in the shop"
                        >
                          🥺
                        </span>
                      )}
                      <span className="block text-[13px] text-on-surface-variant">
                        {p.slug}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-body-md text-on-surface-variant">
                      {p.categoryName || p.categorySlug || (
                        <span className="text-error">uncategorised</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-body-md text-on-surface text-right whitespace-nowrap">
                      {formatPrice(p.priceCents, p.currency)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <StockPill count={p.stockCount} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        {!p.isActive && (
                          <span className="rounded-full bg-surface-container-high text-on-surface-variant px-2 py-0.5 text-[12px]">
                            Hidden
                          </span>
                        )}
                        {p.isBestSeller && (
                          <span className="rounded-full bg-primary-container text-on-primary-container px-2 py-0.5 text-[12px]">
                            Featured
                          </span>
                        )}
                        {p.isNewArrival && (
                          <span className="rounded-full bg-secondary-container text-on-secondary-container px-2 py-0.5 text-[12px]">
                            New
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/inventory/${p.slug}`}
                        className="inline-flex items-center gap-1 text-primary font-label-caps text-label-caps uppercase tracking-wider hover:underline"
                      >
                        Edit
                        <Icon name="chevron_right" className="text-[18px]" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
