import { getAdminProducts } from "@/lib/data/admin";
import { OfflineSaleForm } from "@/components/admin/offline-sale-form";
import { Icon } from "@/components/ui/icon";

export const metadata = { title: "Art Speaks | Record offline sale" };

export default async function RecordSalePage() {
  // Listed pieces only — an unpublished draft isn't something sold at a stall.
  const products = (await getAdminProducts()).filter((p) => p.isActive);

  return (
    <>
      <h1 className="font-headline-md text-headline-lg text-primary mb-1">
        Record offline sale
      </h1>
      <p className="text-body-md text-on-surface-variant mb-5">
        For pieces sold in person — a stall, a fair, a friend. Tap what sold.
        Tap again for two. Stock comes down when you save.
      </p>

      {products.length === 0 ? (
        <div className="rounded-[2rem] border-2 border-dashed border-outline-variant bg-surface-container-low/60 p-10 text-center">
          <Icon name="point_of_sale" className="text-[40px] text-outline" />
          <p className="text-body-md text-on-surface-variant mt-3">
            Nothing listed to sell yet. Add pieces in Inventory first.
          </p>
        </div>
      ) : (
        <OfflineSaleForm products={products} />
      )}
    </>
  );
}
