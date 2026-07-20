"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";

const LOGO_SRC =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuCTyXoVuqkhtjFdw_3_hIVL_LtHaCvoy8wblFrWSVqK-n_C0rk4zIwcUNM5bZEnuAUTCXRq3T2wjrSD5CnoxIAvUePVmCLxv9rRSPr3aSXU9YvJPOPlyajwH1CUOKgs1y1-B-iZp0tED4UVsuEapkAAODGGzb_kE1Bv_9HQ_GuGpJgIJbEhGcjJze4r4gEyOB_-mWS1G0DFHBFw-nO0i8sRopGKZKE-t7DpOYHhbShTlxGQLBuLqotrNcAYs7YaWQXUdcA";

const NAV_LINKS = [
  { label: "Home", href: "/" },
  { label: "Shop All", href: "/shop" },
  { label: "Phone Charms", href: "/shop?collection=phone-charms" },
  { label: "Worry Stones", href: "/shop?collection=worry-stones" },
  { label: "Bookmarks", href: "/shop?collection=bookmarks" },
  { label: "Stationery", href: "/shop?collection=stationery" },
];

export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-md shadow-[0_4px_20px_-5px_rgba(255,183,206,0.2)] h-16 flex items-center px-margin-mobile">
      <div className="flex justify-between items-center w-full">
        <div className="flex items-center gap-3">
          <button
            className="text-primary hover:scale-105 transition-transform duration-200"
            aria-label="Open menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
          >
            <Icon name={menuOpen ? "close" : "menu"} />
          </button>
          <Link href="/" className="flex items-center gap-2">
            <Image
              alt="art_speaks logo"
              className="w-9 h-9 rounded-full object-cover border-2 border-candy-pink"
              src={LOGO_SRC}
              width={36}
              height={36}
            />
            <h1 className="font-display-lg text-headline-md italic text-primary tracking-tight">
              art_speaks
            </h1>
          </Link>
        </div>
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
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-candy-pink text-on-primary-container text-[10px] flex items-center justify-center rounded-full font-bold">
              2
            </span>
          </Link>
          <button
            className="text-primary hover:scale-105 transition-transform duration-200"
            aria-label="Account"
          >
            <Icon name="person" />
          </button>
        </div>
      </div>

      {/* Slide-down menu drawer */}
      {menuOpen ? (
        <>
          <div
            className="fixed inset-0 top-16 bg-primary/10 backdrop-blur-sm z-40"
            onClick={() => setMenuOpen(false)}
          />
          <nav className="absolute top-16 left-0 w-full bg-background border-b-4 border-candy-pink/20 shadow-lg z-50 px-margin-mobile py-6 flex flex-col gap-1">
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
