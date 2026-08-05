"use client";

import { useRef, useState } from "react";
import { ProductImage } from "@/components/ui/product-image";
import Link from "next/link";
import type { Product } from "@/lib/types";
import { formatPrice } from "@/lib/types";
import { Icon } from "@/components/ui/icon";
import { BadgeSticker } from "@/components/ui/badge-sticker";
import { ProductModal } from "@/components/product/product-modal";

type Variant = "bestseller" | "arrival";

export function ProductCarousel({
  eyebrow,
  title,
  badge,
  products,
  viewMoreHref,
  variant,
}: {
  eyebrow?: string;
  title: string;
  badge?: string;
  products: Product[];
  viewMoreHref: string;
  variant: Variant;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState<Product | null>(null);

  const scroll = (dir: 1 | -1) => {
    trackRef.current?.scrollBy({ left: dir * 300, behavior: "smooth" });
  };

  return (
    <div>
      {/* Header row */}
      <div className="px-margin-mobile md:px-margin-desktop flex justify-between items-end mb-6 gap-4">
        <div>
          {badge ? (
            <BadgeSticker className="mb-3">{badge}</BadgeSticker>
          ) : eyebrow ? (
            <span className="text-label-lg font-label-caps text-primary uppercase tracking-[0.1em]">
              {eyebrow}
            </span>
          ) : null}
          <h3 className="text-headline-lg font-headline-md text-on-surface mt-1">
            {title}
          </h3>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Link
            href={viewMoreHref}
            className="hidden sm:inline-flex items-center gap-1 text-primary font-label-caps text-label-lg uppercase tracking-wider border-b-2 border-candy-pink pb-1 hover:text-candy-pink transition-colors"
          >
            View more
            <Icon name="arrow_forward" className="text-[16px]" />
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

      {/* Track */}
      <div
        ref={trackRef}
        className="flex gap-gutter overflow-x-auto px-margin-mobile md:px-margin-desktop hide-scrollbar pb-4 scroll-smooth"
      >
        {products.map((product) =>
          variant === "bestseller" ? (
            <BestSellerCard
              key={product.id}
              product={product}
              onOpen={setSelected}
            />
          ) : (
            <ArrivalCard
              key={product.id}
              product={product}
              onOpen={setSelected}
            />
          ),
        )}
      </div>

      {/* Mobile view-more (header link hidden on small screens) */}
      <div className="px-margin-mobile md:px-margin-desktop mt-2 sm:hidden">
        <Link
          href={viewMoreHref}
          className="inline-flex items-center gap-1 text-primary font-label-caps text-label-lg uppercase tracking-wider border-b-2 border-candy-pink pb-1"
        >
          View more
          <Icon name="arrow_forward" className="text-[16px]" />
        </Link>
      </div>

      {/* Shared detail modal — clicking a card opens it in place instead of
          navigating to the items page. */}
      <ProductModal product={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

function BestSellerCard({
  product,
  onOpen,
}: {
  product: Product;
  onOpen: (product: Product) => void;
}) {
  return (
    <div
      className="min-w-[260px] group cursor-pointer block"
      onClick={() => onOpen(product)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen(product);
        }
      }}
    >
      <div className="aspect-square rounded-[2rem] bg-surface-container-high mb-3 overflow-hidden relative shadow-sm border-2 border-candy-pink/10">
        <ProductImage
          src={product.images[0]}
          alt={product.name}
          sizes="260px"
          className="object-cover transition-transform duration-700 group-hover:scale-110"
        />
        <button
          onClick={(e) => {
            // Wishlist stub — no persistence yet.
            e.stopPropagation();
          }}
          className="absolute top-4 right-4 w-10 h-10 bg-white rounded-full flex items-center justify-center text-candy-pink shadow-sm hover:scale-110 active:scale-95 transition-all z-10"
          aria-label={`Add ${product.name} to wishlist`}
        >
          <Icon name="favorite" className="text-[20px]" />
        </button>
        <button
          onClick={(e) => {
            // Add-to-cart is a stub for now — no cart persistence yet.
            e.stopPropagation();
          }}
          className="absolute bottom-4 right-4 w-12 h-12 bg-white rounded-full flex items-center justify-center text-primary shadow-[4px_4px_0px_#864d61] hover:translate-y-[-2px] transition-all z-10"
          aria-label={`Add ${product.name} to cart`}
        >
          <Icon name="add_shopping_cart" />
        </button>
      </div>
      <div className="text-center">
        <h4 className="font-headline-md text-[14px] text-on-surface mb-1">
          {product.name}
        </h4>
        <p className="text-primary font-bold text-sm">
          {formatPrice(product.priceCents, product.currency)}
        </p>
      </div>
    </div>
  );
}

function ArrivalCard({
  product,
  onOpen,
}: {
  product: Product;
  onOpen: (product: Product) => void;
}) {
  return (
    <div
      className="min-w-[220px] group cursor-pointer block"
      onClick={() => onOpen(product)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen(product);
        }
      }}
    >
      <div className="aspect-[4/5] rounded-[2.5rem] bg-white mb-3 overflow-hidden shadow-md border-4 border-white ring-2 ring-mint-green/30 relative">
        <ProductImage
          src={product.images[0]}
          alt={product.name}
          sizes="220px"
          className="object-cover transition-transform duration-700 group-hover:scale-105"
        />
        <button
          onClick={(e) => {
            // Wishlist stub — no persistence yet.
            e.stopPropagation();
          }}
          className="absolute top-3 right-3 w-10 h-10 bg-white rounded-full flex items-center justify-center text-candy-pink shadow-sm hover:scale-110 active:scale-95 transition-all z-10"
          aria-label={`Add ${product.name} to wishlist`}
        >
          <Icon name="favorite" className="text-[20px]" />
        </button>
        <button
          onClick={(e) => {
            // Add-to-cart is a stub for now — no cart persistence yet.
            e.stopPropagation();
          }}
          className="absolute bottom-3 right-3 w-10 h-10 bg-white rounded-full flex items-center justify-center text-primary shadow-[4px_4px_0px_#864d61] hover:translate-y-[-2px] transition-all z-10"
          aria-label={`Add ${product.name} to cart`}
        >
          <Icon name="add_shopping_cart" className="text-[20px]" />
        </button>
      </div>
      <h4 className="font-headline-md text-[14px] text-on-surface ml-2">
        {product.name}
      </h4>
      <p className="text-primary font-bold text-sm ml-2">
        {formatPrice(product.priceCents, product.currency)}
      </p>
    </div>
  );
}
