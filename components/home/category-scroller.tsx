"use client";

import { useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import type { Category } from "@/lib/types";
import { Icon } from "@/components/ui/icon";

export function CategoryScroller({ categories }: { categories: Category[] }) {
  const trackRef = useRef<HTMLDivElement>(null);

  const scroll = (dir: 1 | -1) => {
    trackRef.current?.scrollBy({ left: dir * 300, behavior: "smooth" });
  };

  return (
    <section className="mb-16 relative">
      <div className="px-margin-mobile md:px-margin-desktop flex justify-between items-end mb-8 gap-4">
        <h3 className="text-headline-lg font-headline-md text-on-surface">
          Shop by Category
        </h3>
        <div className="flex items-center gap-3 shrink-0">
          <Link
            href="/shop"
            className="hidden sm:inline-flex text-primary font-label-caps text-label-lg uppercase tracking-wider border-b-2 border-candy-pink pb-1 hover:text-candy-pink transition-colors"
          >
            View all
          </Link>
          <div className="flex gap-2">
            <button
              onClick={() => scroll(-1)}
              className="w-10 h-10 rounded-full bg-white border-2 border-candy-pink/30 flex items-center justify-center text-primary hover:bg-candy-pink/30 transition-colors"
              aria-label="Scroll left"
            >
              <Icon name="chevron_left" className="text-[24px]" />
            </button>
            <button
              onClick={() => scroll(1)}
              className="w-10 h-10 rounded-full bg-white border-2 border-candy-pink/30 flex items-center justify-center text-primary hover:bg-candy-pink/30 transition-colors"
              aria-label="Scroll right"
            >
              <Icon name="chevron_right" className="text-[24px]" />
            </button>
          </div>
        </div>
      </div>
      <div
        ref={trackRef}
        className="flex gap-gutter overflow-x-auto px-margin-mobile md:px-margin-desktop hide-scrollbar pb-4 scroll-smooth"
      >
        {categories.map((category) => (
          <Link
            key={category.id}
            href={`/shop?collection=${category.slug}`}
            className="w-[200px] shrink-0 text-center group cursor-pointer"
          >
            <div
              className="aspect-square rounded-[4rem] overflow-hidden border-4 mb-4 group-hover:translate-y-[-4px] transition-transform relative"
              style={{
                borderColor: category.accentColor,
                boxShadow: `6px 6px 0px ${category.shadowColor}`,
              }}
            >
              <Image
                src={category.image}
                alt={category.name}
                fill
                sizes="200px"
                className="object-cover"
              />
            </div>
            <span className="text-label-caps font-label-caps text-primary group-hover:font-bold block leading-tight">
              {category.name}
            </span>
          </Link>
        ))}
      </div>
      {/* Mobile view-all (header link hidden on small screens) */}
      <div className="px-margin-mobile md:px-margin-desktop mt-2 sm:hidden">
        <Link
          href="/shop"
          className="inline-flex items-center gap-1 text-primary font-label-caps text-label-lg uppercase tracking-wider border-b-2 border-candy-pink pb-1"
        >
          View all
          <Icon name="arrow_forward" className="text-[16px]" />
        </Link>
      </div>
    </section>
  );
}
