import { NotBuiltYet } from "@/components/admin/not-built-yet";

export const metadata = { title: "Art Speaks | Record sale" };

export default function RecordSalePage() {
  return (
    <NotBuiltYet
      icon="point_of_sale"
      title="Record sale"
      summary="Tap the pieces that sold in person. Stock comes down automatically."
      phase="Phase 4"
    />
  );
}
