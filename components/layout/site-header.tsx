"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { DesktopNav, MobileNav } from "@/components/layout/header-nav";
import type { Category } from "@/lib/types";
import { CartBadge } from "@/components/cart/cart-badge";

const LOGO_SRC =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuCTyXoVuqkhtjFdw_3_hIVL_LtHaCvoy8wblFrWSVqK-n_C0rk4zIwcUNM5bZEnuAUTCXRq3T2wjrSD5CnoxIAvUePVmCLxv9rRSPr3aSXU9YvJPOPlyajwH1CUOKgs1y1-B-iZp0tED4UVsuEapkAAODGGzb_kE1Bv_9HQ_GuGpJgIJbEhGcjJze4r4gEyOB_-mWS1G0DFHBFw-nO0i8sRopGKZKE-t7DpOYHhbShTlxGQLBuLqotrNcAYs7YaWQXUdcA";

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
            <Link href="/" className="flex items-center gap-2">
              <Image
                alt="Art Speaks logo"
                className="w-9 h-9 rounded-full object-cover border-2 border-candy-pink"
                src={LOGO_SRC}
                width={36}
                height={36}
              />
              <h1 className="font-display-lg text-headline-md italic text-primary tracking-tight">
                Art Speaks
              </h1>
            </Link>
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
