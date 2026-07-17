"use client";

import { useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";

const NAV_LINKS = [
  { label: "Home", href: "/" },
  { label: "Shop All", href: "/shop" },
  { label: "Phone Charms", href: "/shop?collection=phone-charms" },
  { label: "Worry Stones", href: "/shop?collection=worry-stones" },
  { label: "Bookmarks", href: "/shop?collection=bookmarks" },
  { label: "Stationery", href: "/shop?collection=stationery" },
];

export function ShopHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <header className="bg-surface-bright border-b border-outline-variant w-full top-0 sticky shadow-sm z-50">
      <div className="flex justify-between items-center px-margin-mobile py-unit w-full max-w-container-max mx-auto h-16">
        <button
          className="text-primary hover:scale-105 transition-transform duration-200 active:scale-95"
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
          _a_r_t_speaks
        </Link>
        <div className="flex gap-4 items-center">
          <button
            className="text-on-surface-variant hover:scale-105 transition-transform duration-200 active:scale-95"
            aria-label="Search"
            aria-expanded={searchOpen}
            onClick={() => setSearchOpen((v) => !v)}
          >
            <Icon name="search" />
          </button>
          <button
            className="text-primary hover:scale-105 transition-transform duration-200 active:scale-95 relative"
            aria-label="Cart"
          >
            <Icon name="shopping_bag" />
            <span className="absolute -top-1 -right-1 bg-candy-pink text-[10px] w-4 h-4 flex items-center justify-center rounded-full text-on-primary-container font-bold">
              2
            </span>
          </button>
        </div>
      </div>

      {searchOpen ? (
        <div className="px-margin-mobile pb-3 max-w-container-max mx-auto">
          {/* Search is not wired to filtering yet. */}
          <input
            type="search"
            autoFocus
            placeholder="Search the shop…"
            className="w-full bg-white border-2 border-candy-pink/20 rounded-full py-3 px-5 outline-none focus:border-primary text-body-md shadow-sm"
          />
        </div>
      ) : null}

      {menuOpen ? (
        <>
          <div
            className="fixed inset-0 top-16 bg-primary/10 backdrop-blur-sm z-40"
            onClick={() => setMenuOpen(false)}
          />
          <nav className="absolute top-16 left-0 w-full bg-surface-bright border-b-4 border-candy-pink/20 shadow-lg z-50 px-margin-mobile py-6 flex flex-col gap-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className="py-3 px-4 rounded-2xl text-primary font-label-caps text-label-caps uppercase tracking-wider hover:bg-surface-container-high transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </>
      ) : null}
    </header>
  );
}
