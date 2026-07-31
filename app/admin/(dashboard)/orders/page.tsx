import { NotBuiltYet } from "@/components/admin/not-built-yet";

export const metadata = { title: "Art Speaks | Orders" };

export default function OrdersPage() {
  return (
    <NotBuiltYet
      icon="receipt_long"
      title="Orders"
      summary="Online orders and where each one has got to."
      phase="Phase 4"
    />
  );
}
