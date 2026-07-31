import { NotBuiltYet } from "@/components/admin/not-built-yet";

export const metadata = { title: "Art Speaks | Inventory" };

export default function InventoryPage() {
  return (
    <NotBuiltYet
      icon="inventory_2"
      title="Inventory"
      summary="Every piece you make — price, stock, photos, and which ones are featured."
      phase="Phase 3"
    />
  );
}
