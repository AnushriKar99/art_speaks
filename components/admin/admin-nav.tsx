"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui/icon";

/**
 * `exact` distinguishes /admin/sales (the chart) from /admin/sales/new
 * (recording one) — a prefix match would light both tabs at once.
 */
const NAV = [
  { label: "Inventory", icon: "inventory_2", href: "/admin/inventory" },
  { label: "Record sale", icon: "point_of_sale", href: "/admin/sales/new", exact: true },
  { label: "Sales", icon: "monitoring", href: "/admin/sales", exact: true },
  { label: "Orders", icon: "receipt_long", href: "/admin/orders" },
];

function isActive(pathname: string, href: string, exact?: boolean) {
  return exact ? pathname === href : pathname.startsWith(href);
}

/** Pill row, shown in the header from `lg` up. */
export function AdminNavDesktop() {
  const pathname = usePathname();

  return (
    <nav className="hidden lg:flex items-center gap-1">
      {NAV.map((item) => {
        const active = isActive(pathname, item.href, item.exact);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`flex items-center gap-2 px-4 py-2 rounded-full font-label-caps text-label-lg uppercase tracking-wider transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
              active
                ? "bg-primary text-on-primary"
                : "text-primary hover:bg-surface-container-high"
            }`}
          >
            <Icon name={item.icon} className="text-[20px]" filled={active} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

/**
 * Fixed bottom bar below `lg`. Mirrors the storefront's bottom-tab-bar so the
 * studio side feels like the same app — and puts "Record sale" in thumb reach,
 * which is where it gets used: standing at a market stall.
 */
export function AdminNavMobile() {
  const pathname = usePathname();

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 w-full z-50 flex justify-around items-stretch h-16 px-1 bg-surface-container shadow-[0_-4px_12px_rgba(255,183,206,0.15)] rounded-t-xl pb-[env(safe-area-inset-bottom)]">
      {NAV.map((item) => {
        const active = isActive(pathname, item.href, item.exact);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`squishy flex flex-col items-center justify-center gap-0.5 flex-1 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary ${
              active ? "text-primary" : "text-on-surface-variant"
            }`}
          >
            <Icon name={item.icon} className="text-[22px]" filled={active} />
            <span className="font-label-caps text-[10px] leading-none text-center">
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
