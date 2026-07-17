"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui/icon";

const TABS = [
  { label: "Shop", icon: "storefront", href: "/shop" },
  { label: "Gallery", icon: "palette", href: "/" },
  { label: "Wishlist", icon: "favorite", href: "/shop?collection=wishlist" },
  { label: "Me", icon: "face", href: "#" },
];

export function BottomTabBar() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center h-16 px-2 bg-surface-container shadow-[0_-4px_12px_rgba(255,183,206,0.15)] rounded-t-xl lg:max-w-md lg:left-1/2 lg:-translate-x-1/2 lg:bottom-4 lg:rounded-2xl lg:shadow-xl">
      {TABS.map((tab) => {
        const active =
          tab.href !== "#" &&
          (tab.href === "/"
            ? pathname === "/"
            : pathname.startsWith(tab.href.split("?")[0]));
        return (
          <Link
            key={tab.label}
            href={tab.href}
            className={
              active
                ? "flex flex-col items-center justify-center bg-candy-pink text-on-primary-container rounded-xl px-4 py-1 active:scale-90 transition-all duration-200"
                : "flex flex-col items-center justify-center text-on-surface-variant px-4 py-1 hover:bg-surface-container-high rounded-xl active:scale-90 transition-all duration-200"
            }
          >
            <Icon name={tab.icon} />
            <span className="font-label-caps text-[10px]">{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
