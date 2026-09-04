"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { DesktopNav, MobileNav } from "@/components/layout/header-nav";
import type { Category } from "@/lib/types";
import { CartBadge } from "@/components/cart/cart-badge";
import { BrandMark } from "@/components/layout/brand-mark";
import { HeaderSearch } from "@/components/layout/header-search";

export function ShopHeader({
  categories,
  account,
  query,
  isWishlistView = false,
}: {
  categories: Category[];
  /** <AccountMenu /> — a Server Component, so it arrives as a prop. */
  account?: React.ReactNode;
  /** Current `?q=`, so the box still shows what was searched for. */
  query?: string;
  /**
   * True on `/shop?collection=wishlist`, which hides the wishlist button —
   * it would only link to the page you are already on.
   *
   * Passed down rather than read here with `useSearchParams`, which would put
   * every page using this header behind a Suspense boundary to prerender. The
   * shop page already knows the collection server-side.
   */
  isWishlistView?: boolean;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  // Open by default when there's an active search, so the term stays visible
  // rather than the results looking like an unexplained filter.
  const [searchOpen, setSearchOpen] = useState(Boolean(query));
  const pathname = usePathname();
  const isCartPage = pathname === "/cart";

  return (
    <>
      <header className="bg-surface-bright border-b border-outline-variant w-full top-0 sticky shadow-sm z-50">
        <div className="flex justify-between items-center px-margin-mobile py-unit w-full max-w-container-max mx-auto h-16">
          <button
            className="text-primary hover:scale-105 transition-transform duration-200 active:scale-95 lg:hidden"
            aria-label="Open menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
          >
            <Icon name={menuOpen ? "close" : "menu"} />
          </button>
          <BrandMark />
          <DesktopNav categories={categories} />
          <div className="flex gap-4 items-center">
            <button
              className="text-on-surface-variant hover:scale-105 transition-transform duration-200 active:scale-95"
              aria-label="Search"
              aria-expanded={searchOpen}
              onClick={() => setSearchOpen((v) => !v)}
            >
              <Icon name="search" />
            </button>
            {isWishlistView ? null : (
              <Link
                href="/shop?collection=wishlist"
                className="text-primary hover:scale-105 transition-transform duration-200 active:scale-95"
                aria-label="Wishlist"
              >
                <Icon name="favorite" />
              </Link>
            )}
            {isCartPage ? null : (
              <Link
                href="/cart"
                className="text-primary hover:scale-105 transition-transform duration-200 active:scale-95 relative"
                aria-label="Cart"
              >
                <Icon name="shopping_bag" />
                <CartBadge />
              </Link>
            )}
            {account}
          </div>
        </div>

        {searchOpen ? (
          <div className="px-margin-mobile pb-3 max-w-container-max mx-auto">
            <HeaderSearch query={query} />
          </div>
        ) : null}
      </header>

      {/* Left-side navigation panel (rendered outside <header> — a fixed/filtered
          ancestor would otherwise clip these fixed-position elements to its box). */}
      <div
        className={`fixed inset-0 top-16 bg-primary/10 backdrop-blur-sm z-40 transition-opacity duration-300 lg:hidden ${
          menuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setMenuOpen(false)}
        aria-hidden="true"
      />
      <nav
        className={`fixed top-16 left-0 bottom-0 w-72 sm:w-80 max-w-[85vw] bg-surface-bright border-r-4 border-candy-pink/20 shadow-lg z-50 px-margin-mobile py-6 flex flex-col gap-1 overflow-y-auto transition-transform duration-300 ease-out lg:hidden ${
          menuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        aria-hidden={!menuOpen}
      >
        <MobileNav categories={categories} onNavigate={() => setMenuOpen(false)} />
      </nav>
    </>
  );
}
