"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * `exact` distinguishes /admin/sales (the chart) from /admin/sales/new
 * (recording one) — a prefix match would light both tabs at once.
 */
const NAV = [
  { label: "Dashboard", href: "/admin", exact: true },
  { label: "Inventory", href: "/admin/inventory" },
  { label: "Offline sale", href: "/admin/sales/new", exact: true },
  { label: "Sales", href: "/admin/sales", exact: true },
  { label: "Orders", href: "/admin/orders" },
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
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

/**
 * Fixed bottom bar below `lg`. Puts the offline-sale form in thumb reach,
 * which is where it gets used: standing at a market stall.
 *
 * The storefront used to carry a matching bar, and this mirrored it so the
 * studio side felt like the same app. That one is gone — the storefront now
 * navigates entirely from its top bar — but this stays: the admin screens are
 * a working tool used one-handed, which the shop is not.
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
            className={`squishy flex items-center justify-center flex-1 my-2 mx-0.5 rounded-xl px-1 text-center focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary transition-colors ${
              active
                ? "bg-primary text-on-primary"
                : "text-on-surface-variant"
            }`}
          >
            <span className="font-label-caps text-[12px] leading-tight text-balance">
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
