"use client";

import { useEffect, useState } from "react";
import { ProductImage } from "@/components/ui/product-image";
import type { Product } from "@/lib/types";
import { formatPrice } from "@/lib/types";
import { Icon } from "@/components/ui/icon";

export function ProductModal({
  product,
  onClose,
}: {
  product: Product | null;
  onClose: () => void;
}) {
  if (!product) return null;
  // Keyed on the product id so qty/activeImage reset via remount when a
  // different product opens — no state-syncing effect needed.
  return <ProductModalContent key={product.id} product={product} onClose={onClose} />;
}

function ProductModalContent({
  product,
  onClose,
}: {
  product: Product;
  onClose: () => void;
}) {
  const [qty, setQty] = useState(1);
  const [activeImage, setActiveImage] = useState(0);

  // Close on Escape and lock body scroll while open.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const lowStock = product.stockCount <= 5;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8">
      <div
        className="absolute inset-0 bg-primary/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-surface-bright w-full max-w-2xl max-h-[90vh] md:max-h-[751px] rounded-3xl shadow-2xl flex flex-col overflow-hidden border-4 border-primary">
        <button
          className="absolute top-4 right-4 z-[110] bg-white w-10 h-10 flex items-center justify-center rounded-full text-primary shadow-md hover:scale-110 active:scale-90 transition-all border-2 border-primary"
          onClick={onClose}
          aria-label="Close"
        >
          <Icon name="close" />
        </button>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {/* Image */}
          <div className="relative aspect-[4/3] md:aspect-video bg-surface-container-high overflow-hidden">
            <ProductImage
              src={product.images[activeImage]}
              alt={product.name}
              sizes="(min-width: 768px) 42rem, 100vw"
              className="object-cover"
            />
            {product.images.length > 1 ? (
              <div className="absolute bottom-4 left-0 w-full flex justify-center gap-2">
                {product.images.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImage(i)}
                    className={`w-3 h-3 rounded-full ${
                      i === activeImage ? "bg-primary" : "bg-primary/30"
                    }`}
                    aria-label={`View image ${i + 1}`}
                  />
                ))}
              </div>
            ) : null}
          </div>

          {/* Content */}
          <div className="p-8 pb-32">
            <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4 mb-6">
              <div>
                <h2 className="font-display-lg text-display-lg-mobile text-primary mb-1">
                  {product.name}
                </h2>
                <p className="font-headline-md text-headline-md text-on-surface-variant">
                  {formatPrice(product.priceCents, product.currency)}
                </p>
              </div>
              {lowStock ? (
                <div className="flex items-center gap-2 bg-lemon-yellow/50 px-4 py-2 rounded-2xl border-2 border-lemon-yellow shrink-0">
                  <Icon name="inventory_2" className="text-tertiary" />
                  <span className="font-label-caps text-on-tertiary-container">
                    Only {product.stockCount} left!
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2 bg-secondary-container/60 px-4 py-2 rounded-2xl border-2 border-secondary-container shrink-0">
                  <Icon name="check_circle" className="text-secondary" />
                  <span className="font-label-caps text-on-secondary-container">
                    In stock
                  </span>
                </div>
              )}
            </div>

            <div className="space-y-6">
              <div>
                <h4 className="font-label-caps text-label-caps text-outline uppercase tracking-widest mb-2">
                  Description
                </h4>
                <p className="font-body-lg text-body-lg text-on-surface leading-relaxed">
                  {product.description}
                </p>
              </div>
              <div className="bg-surface-container p-6 rounded-2xl border-2 border-dashed border-primary/30">
                <h4 className="font-label-caps text-label-caps text-primary flex items-center gap-2 mb-3">
                  <Icon name="edit" className="text-sm" />
                  Artisan Notes
                </h4>
                <p className="font-body-md text-body-md text-on-surface-variant italic">
                  {product.artisanNote}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Sticky footer */}
        <div className="absolute bottom-0 left-0 w-full bg-surface-bright/90 backdrop-blur-md p-6 border-t-2 border-primary-container flex items-center gap-4">
          <div className="flex items-center border-2 border-primary rounded-xl overflow-hidden">
            <button
              className="px-4 py-2 hover:bg-primary-container transition-colors"
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              aria-label="Decrease quantity"
            >
              −
            </button>
            <span className="px-4 font-bold">{qty}</span>
            <button
              className="px-4 py-2 hover:bg-primary-container transition-colors"
              onClick={() =>
                setQty((q) => Math.min(product.stockCount, q + 1))
              }
              aria-label="Increase quantity"
            >
              +
            </button>
          </div>
          <button
            onClick={() => {
              // Add-to-cart stub — no cart persistence yet.
            }}
            className="flex-1 bg-candy-pink text-primary font-display-lg-mobile text-[20px] py-4 rounded-xl shadow-[4px_4px_0px_#864d61] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all active:scale-95 flex items-center justify-center gap-3"
          >
            <Icon name="shopping_cart" />
            Add to Cart
          </button>
        </div>
      </div>
    </div>
  );
}
