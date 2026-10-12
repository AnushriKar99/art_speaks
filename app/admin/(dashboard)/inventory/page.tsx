import Link from "next/link";
import { getAdminProducts } from "@/lib/data/admin";
import { Icon } from "@/components/ui/icon";
import { InventoryTable } from "@/components/admin/inventory-table";

export const metadata = { title: "Art Speaks | Inventory" };

const LOW_STOCK = 3;

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
        <InventoryTable products={products} />
      )}
    </>
  );
}
