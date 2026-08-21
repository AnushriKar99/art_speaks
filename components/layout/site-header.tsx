"use client";

import { useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { DesktopNav, MobileNav } from "@/components/layout/header-nav";
import type { Category } from "@/lib/types";
import { CartBadge } from "@/components/cart/cart-badge";
import { BrandMark } from "@/components/layout/brand-mark";

export function SiteHeader({
  categories,
  account,
}: {
  categories: Category[];
  /** <AccountMenu /> — a Server Component, so it arrives as a prop. */
  account?: React.ReactNode;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <header className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-md shadow-[0_4px_20px_-5px_rgba(255,183,206,0.2)] h-16 flex items-center px-margin-mobile">
        <div className="flex justify-between items-center w-full">
          <div className="flex items-center gap-3">
            <button
              className="text-primary hover:scale-105 transition-transform duration-200 lg:hidden"
              aria-label="Open menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((v) => !v)}
            >
              <Icon name={menuOpen ? "close" : "menu"} />
            </button>
            <BrandMark asHeading />
          </div>
          <DesktopNav categories={categories} />
          <div className="flex items-center gap-4">
            <Link
              href="/shop?collection=wishlist"
              className="text-primary hover:scale-105 transition-transform duration-200"
              aria-label="Wishlist"
            >
              <Icon name="favorite" />
            </Link>
            <Link
              href="/cart"
              className="text-primary hover:scale-105 transition-transform duration-200 relative"
              aria-label="Cart"
            >
              <Icon name="shopping_bag" />
              <CartBadge />
            </Link>
            {account}
          </div>
        </div>
      </header>

      {/* Left-side navigation panel (rendered outside <header> — its
          backdrop-blur establishes a containing block that would otherwise
          clip these fixed-position elements to the header's own box). */}
      <div
        className={`fixed inset-0 top-16 bg-primary/10 backdrop-blur-sm z-40 transition-opacity duration-300 lg:hidden ${
          menuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setMenuOpen(false)}
        aria-hidden="true"
      />
      <nav
        className={`fixed top-16 left-0 bottom-0 w-72 sm:w-80 max-w-[85vw] bg-background border-r-4 border-candy-pink/20 shadow-lg z-50 px-margin-mobile py-6 flex flex-col gap-1 overflow-y-auto transition-transform duration-300 ease-out lg:hidden ${
          menuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        aria-hidden={!menuOpen}
      >
        <MobileNav categories={categories} onNavigate={() => setMenuOpen(false)} />
      </nav>
    </>
  );
}
