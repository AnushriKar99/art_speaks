"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { DesktopNav, MobileNav } from "@/components/layout/header-nav";
import type { Category } from "@/lib/types";

export function ShopHeader({
  categories,
  account,
  query,
  collection,
}: {
  categories: Category[];
  /** <AccountMenu /> — a Server Component, so it arrives as a prop. */
  account?: React.ReactNode;
  /** Current `?q=`, so the box still shows what was searched for. */
  query?: string;
  /** Current `?collection=`, so clearing a search returns here, not to All Items. */
  collection?: string;
}) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  // Clearing a search should put you back where you were browsing. Dropping
  // someone from "Bookmarks" to "All Items" because they emptied the search box
  // silently discards a filter they never touched.
  const clearedHref = collection
    ? `/shop?collection=${encodeURIComponent(collection)}`
    : "/shop";
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
          <Link
            className="font-headline-md text-headline-md font-bold text-primary tracking-tight"
            href="/"
          >
            Art Speaks
          </Link>
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
            {isCartPage ? null : (
              <Link
                href="/cart"
                className="text-primary hover:scale-105 transition-transform duration-200 active:scale-95 relative"
                aria-label="Cart"
              >
                <Icon name="shopping_bag" />
                <span className="absolute -top-1 -right-1 bg-candy-pink text-[10px] w-4 h-4 flex items-center justify-center rounded-full text-on-primary-container font-bold">
                  2
                </span>
              </Link>
            )}
            {account}
          </div>
        </div>

        {searchOpen ? (
          <div className="px-margin-mobile pb-3 max-w-container-max mx-auto">
            {/* A plain GET form, so the term lands in the URL as ?q=. That
                makes results shareable and bookmarkable, keeps the back button
                honest, and means search works before any JavaScript loads. */}
            <form action="/shop" method="get" className="relative">
              <input
                type="search"
                name="q"
                defaultValue={query ?? ""}
                autoFocus
                placeholder="Search the shop…"
                aria-label="Search products"
                // Emptying the box drops the filter straight away, rather than
                // leaving stale results on screen until you press Enter. Fires
                // for the native ✕ in the search input as well as for deleting
                // by hand.
                onInput={(e) => {
                  if (query && e.currentTarget.value === "") {
                    router.push(clearedHref);
                  }
                }}
                className="w-full bg-white border-2 border-candy-pink/20 rounded-full py-3 pl-5 pr-20 outline-none focus:border-primary text-body-md shadow-sm"
              />
              {query ? (
                // Firefox draws no native clear control, and on mobile the
                // native one is easy to miss — so provide our own.
                <Link
                  href={clearedHref}
                  aria-label="Clear search"
                  className="absolute right-11 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-primary transition-colors p-2"
                >
                  <Icon name="close" className="text-[20px]" />
                </Link>
              ) : null}
              <button
                type="submit"
                aria-label="Search"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 text-primary hover:scale-110 transition-transform active:scale-95 p-2"
              >
                <Icon name="search" />
              </button>
            </form>
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
