import { NotBuiltYet } from "@/components/admin/not-built-yet";

export const metadata = { title: "Art Speaks | Sales" };

export default function SalesPage() {
  return (
    <NotBuiltYet
      icon="monitoring"
      title="Sales"
      summary="Revenue by month, online against offline, and what actually sells."
      phase="Phase 4"
    />
  );
}
