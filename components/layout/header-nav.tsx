"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Category } from "@/lib/types";
import { Icon } from "@/components/ui/icon";

const linkClasses =
  "text-primary font-label-caps text-label-caps uppercase tracking-wider hover:text-candy-pink transition-colors";
const dropdownItemClasses =
  "px-4 py-2 mx-1 rounded-xl text-primary font-label-caps text-label-caps uppercase tracking-wider hover:bg-surface-container-high transition-colors";

/** Desktop inline navbar: "Home" plus a "Categories" dropdown listing every category. */
export function DesktopNav({ categories }: { categories: Category[] }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  return (
    <nav className="hidden lg:flex items-center gap-8">
      <Link href="/" className={linkClasses}>
        Home
      </Link>
      <Link href="/#custom-orders" className={linkClasses}>
        Custom Orders
      </Link>
      <div className="relative" ref={containerRef}>
        <button
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className={`flex items-center gap-1 ${linkClasses}`}
        >
          Categories
          <Icon name={open ? "expand_less" : "expand_more"} className="text-base" />
        </button>
        {open ? (
          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-3 w-64 bg-surface-container-lowest border border-outline-variant rounded-2xl shadow-lg py-2 flex flex-col gap-1 z-50">
            <Link href="/shop" onClick={() => setOpen(false)} className={dropdownItemClasses}>
              All Items
            </Link>
            {categories.map((category) => (
              <Link
                key={category.id}
                href={`/shop?collection=${category.slug}`}
                onClick={() => setOpen(false)}
                className={dropdownItemClasses}
              >
                {category.name}
              </Link>
            ))}
          </div>
        ) : null}
      </div>
      <Link href="/about" className={linkClasses}>
        About Us
      </Link>
      <Link href="/refund-policy" className={linkClasses}>
        Refund Policy
      </Link>
    </nav>
  );
}

/** Mobile left-panel links: "Home" plus a "Categories" accordion listing every category. */
export function MobileNav({
  categories,
  onNavigate,
}: {
  categories: Category[];
  onNavigate: () => void;
}) {
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const itemClasses =
    "py-3 px-4 rounded-2xl text-primary font-label-caps text-label-caps uppercase tracking-wider hover:bg-surface-container-high transition-colors";

  return (
    <>
      <Link href="/" onClick={onNavigate} className={itemClasses}>
        Home
      </Link>
      <Link href="/#custom-orders" onClick={onNavigate} className={itemClasses}>
        Custom Orders
      </Link>
      <button
        onClick={() => setCategoriesOpen((v) => !v)}
        aria-expanded={categoriesOpen}
        className={`flex items-center justify-between ${itemClasses}`}
      >
        Categories
        <Icon name={categoriesOpen ? "expand_less" : "expand_more"} />
      </button>
      {categoriesOpen ? (
        <div className="flex flex-col gap-1 pl-4">
          <Link
            href="/shop"
            onClick={onNavigate}
            className="py-2 px-4 rounded-2xl text-primary/80 font-label-caps text-label-caps uppercase tracking-wider hover:bg-surface-container-high transition-colors"
          >
            All Items
          </Link>
          {categories.map((category) => (
            <Link
              key={category.id}
              href={`/shop?collection=${category.slug}`}
              onClick={onNavigate}
              className="py-2 px-4 rounded-2xl text-primary/80 font-label-caps text-label-caps uppercase tracking-wider hover:bg-surface-container-high transition-colors"
            >
              {category.name}
            </Link>
          ))}
        </div>
      ) : null}
      <Link href="/about" onClick={onNavigate} className={itemClasses}>
        About Us
      </Link>
      <Link href="/refund-policy" onClick={onNavigate} className={itemClasses}>
        Refund Policy
      </Link>
    </>
  );
}
