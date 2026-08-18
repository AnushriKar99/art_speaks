import Link from "next/link";
import { Icon } from "@/components/ui/icon";

export const metadata = { title: "Art Speaks | Admin Dashboard" };

const DESTINATIONS = [
  {
    href: "/admin/inventory",
    icon: "inventory_2",
    title: "Inventory",
    blurb: "Add pieces, edit prices, upload photos, keep stock counts honest.",
  },
  {
    href: "/admin/sales/new",
    icon: "point_of_sale",
    title: "Record offline sale",
    blurb: "Log an in-person sale. Tap the pieces that sold — stock updates itself.",
  },
  {
    href: "/admin/sales",
    icon: "monitoring",
    title: "Sales",
    blurb: "Revenue by month, online against offline, and what actually sells.",
  },
  {
    href: "/admin/orders",
    icon: "receipt_long",
    title: "Orders",
    blurb: "Online orders and where each one has got to.",
  },
];

export default function AdminDashboardPage() {
  return (
    <>
      <h1 className="font-headline-md text-headline-lg text-primary mb-1">
        Admin Dashboard
      </h1>
      <p className="text-body-md text-on-surface-variant mb-8">
        Everything behind the shop front.
      </p>

      <div className="grid gap-gutter sm:grid-cols-2">
        {DESTINATIONS.map((d) => (
          <Link
            key={d.href}
            href={d.href}
            className="group rounded-[2rem] bg-surface-container-lowest border-2 border-candy-pink/40 p-6 transition-colors hover:border-candy-pink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <Icon
              name={d.icon}
              className="text-[32px] text-primary-container group-hover:text-candy-pink transition-colors"
              filled
            />
            <h2 className="font-headline-md text-headline-md text-primary mt-3 mb-1">
              {d.title}
            </h2>
            <p className="text-body-md text-on-surface-variant">{d.blurb}</p>
          </Link>
        ))}
      </div>
    </>
  );
}
