import Link from "next/link";
import { getAdminProducts } from "@/lib/data/admin";
import { formatPrice } from "@/lib/types";
import { Icon } from "@/components/ui/icon";

export const metadata = { title: "Art Speaks | Inventory" };

/** Below this, a piece is nearly gone — matches the low_stock view in 0006. */
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

export default async function InventoryPage() {
  const products = await getAdminProducts();

  const outOfStock = products.filter((p) => p.stockCount === 0).length;
  const lowStock = products.filter(
    (p) => p.stockCount > 0 && p.stockCount <= LOW_STOCK,
  ).length;
  const noPhoto = products.filter((p) => p.images.length === 0).length;
  const hidden = products.filter((p) => !p.isActive).length;

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4 mb-1">
        <h1 className="font-headline-md text-headline-lg text-primary">
          Inventory
        </h1>
        <Link
          href="/admin/inventory/new"
          className="tactile-button inline-flex items-center gap-2 rounded-2xl bg-primary text-on-primary font-headline-md px-5 py-2.5 text-body-md"
        >
          <Icon name="add" className="text-[20px]" />
          Add product
        </Link>
      </div>
      <p className="text-body-md text-on-surface-variant mb-6">
        {products.length} {products.length === 1 ? "piece" : "pieces"}
        {hidden > 0 ? ` · ${hidden} hidden from the shop` : ""}
      </p>

      {/* Only surface counts that need doing something about. */}
      {(outOfStock > 0 || lowStock > 0 || noPhoto > 0) && (
        <div className="flex flex-wrap gap-2 mb-6">
          {outOfStock > 0 && (
            <span className="rounded-full bg-error-container text-on-error-container px-3 py-1.5 text-body-md">
              {outOfStock} out of stock
            </span>
          )}
          {lowStock > 0 && (
            <span className="rounded-full bg-lemon-yellow text-on-tertiary-container px-3 py-1.5 text-body-md">
              {lowStock} running low
            </span>
          )}
          {noPhoto > 0 && (
            <span className="rounded-full bg-surface-container-high text-on-surface-variant px-3 py-1.5 text-body-md">
              {noPhoto} need a photo
            </span>
          )}
        </div>
      )}

      {products.length === 0 ? (
        <div className="rounded-[2rem] border-2 border-dashed border-outline-variant bg-surface-container-low/60 p-10 text-center">
          <Icon name="inventory_2" className="text-[40px] text-outline" />
          <p className="text-body-md text-on-surface-variant mt-3">
            Nothing listed yet. Add your first piece to see it in the shop.
          </p>
        </div>
      ) : (
        <div className="rounded-[2rem] border-2 border-candy-pink/30 bg-surface-container-lowest overflow-hidden">
          {/* A wide table scrolls inside its own box, never the page. */}
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
                {products.map((p) => (
                  <tr
                    key={p.id}
                    className="border-t border-outline-variant/60 hover:bg-surface-container-low transition-colors"
                  >
                    <td className="px-4 py-3">
                      <span className="text-body-md text-on-surface">
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
                      {p.categorySlug || (
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
    </>
  );
}
