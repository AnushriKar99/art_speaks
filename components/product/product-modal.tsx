"use client";

import { useEffect, useRef, useState } from "react";
import { ProductImage } from "@/components/ui/product-image";
import type { Product } from "@/lib/types";
import { formatPrice } from "@/lib/types";
import { Icon } from "@/components/ui/icon";
import { useCart } from "@/lib/cart/cart-store";
import { useSaveToggle } from "@/lib/wishlist/use-save-toggle";
import Link from "next/link";

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
  const { add } = useCart();
  const { wishlist, saveToggle } = useSaveToggle();
  const [qty, setQty] = useState(1);
  const [activeImage, setActiveImage] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);
  const saved = wishlist.has(product.id);

  // Escape, body scroll lock, and the focus handling a dialog needs.
  //
  // Without the last part, a keyboard user activates a card, the modal
  // appears, and focus is still behind it on the page — so Tab walks the
  // catalogue underneath while a dialog they cannot reach sits on top.
  useEffect(() => {
    const returnFocusTo = document.activeElement as HTMLElement | null;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;

      // Trap Tab inside the panel, so focus cannot wander onto the page behind.
      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    // Move focus in, so a screen reader announces the dialog and Tab starts
    // from inside it.
    panelRef.current?.focus();

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      // Put focus back where it came from, or it lands on <body> and the
      // reader loses its place in the grid.
      returnFocusTo?.focus?.();
    };
  }, [onClose]);

  const lowStock = product.stockCount <= 5;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6">
      <div
        className="absolute inset-0 bg-primary/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-modal-title"
        tabIndex={-1}
        // Landscape on a laptop, stacked below it. Capped both ways so a short
        // viewport shrinks it rather than being overflowed — a fixed pixel
        // height could not, and used to render taller than the window.
        className="relative bg-surface-bright w-full max-w-4xl max-h-[min(88vh,600px)] rounded-[2rem] shadow-2xl flex flex-col md:flex-row overflow-hidden border-4 border-primary outline-none"
      >
        <button
          className="absolute top-4 right-4 z-[110] bg-white w-10 h-10 flex items-center justify-center rounded-full text-primary shadow-md hover:scale-110 active:scale-90 transition-all border-2 border-primary"
          onClick={onClose}
          aria-label="Close"
        >
          <Icon name="close" />
        </button>

        {/* Photo.
            `object-contain`, not cover: these are the studio's own phone
            shots, portrait and square and occasionally wide, and nothing
            records their shape — so any fixed frame with `cover` crops
            somebody's work. Contain shows every photo whole and lets the
            neutral panel take up the slack. */}
        <div className="relative shrink-0 aspect-square sm:aspect-[4/3] md:aspect-auto md:w-1/2 md:h-auto bg-surface-container-high overflow-hidden">
          <ProductImage
            src={product.images[activeImage]}
            alt={product.name}
            sizes="(min-width: 768px) 28rem, 100vw"
            className="object-contain"
          />
          {product.images.length > 1 ? (
            <div className="absolute bottom-3 left-0 w-full flex justify-center gap-2">
              {product.images.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImage(i)}
                  className={`w-3 h-3 rounded-full transition-colors ${
                    i === activeImage ? "bg-primary" : "bg-primary/30"
                  }`}
                  aria-label={`View image ${i + 1}`}
                />
              ))}
            </div>
          ) : null}
        </div>

        {/* Details — scrolls on its own so the action row stays put. */}
        <div className="flex-1 min-h-0 flex flex-col">
          <div className="flex-1 overflow-y-auto custom-scrollbar p-5 md:p-6">
            {/* Right padding on the heading only, to clear the close button
                that floats over this column on the landscape layout. */}
            <div className="pr-12">
              <h2
                id="product-modal-title"
                className="font-display-lg text-display-lg-mobile text-primary mb-1"
              >
                {product.name}
              </h2>
              <p className="font-headline-md text-headline-md text-on-surface-variant">
                {formatPrice(product.priceCents, product.currency)}
              </p>
            </div>

            <div className="mt-4">
              {lowStock ? (
                <div className="inline-flex items-center gap-2 bg-lemon-yellow/50 px-4 py-2 rounded-2xl border-2 border-lemon-yellow">
                  <Icon name="inventory_2" className="text-tertiary" />
                  <span className="font-label-caps text-on-tertiary-container">
                    Only {product.stockCount} left!
                  </span>
                </div>
              ) : (
                <div className="inline-flex items-center gap-2 bg-secondary-container/60 px-4 py-2 rounded-2xl border-2 border-secondary-container">
                  <Icon name="check_circle" className="text-secondary" />
                  <span className="font-label-caps text-on-secondary-container">
                    In stock
                  </span>
                </div>
              )}
            </div>

            <div className="mt-5 space-y-4">
              <div>
                <h4 className="font-label-caps text-label-caps text-outline uppercase tracking-widest mb-2">
                  Description
                </h4>
                <p className="font-body-lg text-body-lg text-on-surface leading-relaxed">
                  {product.description}
                </p>
              </div>
              {product.artisanNote ? (
                <div className="bg-surface-container p-4 rounded-2xl border-2 border-dashed border-primary/30">
                  <h4 className="font-label-caps text-label-caps text-primary flex items-center gap-2 mb-2">
                    <Icon name="edit" className="text-sm" />
                    Artisan Notes
                  </h4>
                  <p className="font-body-md text-body-md text-on-surface-variant italic">
                    {product.artisanNote}
                  </p>
                </div>
              ) : null}
              <p className="text-center">
                {/* The modal has no URL of its own, so this is how a customer
                    gets a link they can paste into a WhatsApp reply or an
                    Instagram story. */}
                <Link
                  href={`/shop/${product.slug}`}
                  className="text-body-md text-primary underline hover:no-underline"
                >
                  Open full page
                </Link>
              </p>
            </div>
          </div>

          {/* Action row — in the flex flow, not floated over the text, so it
              cannot cover the description on a short viewport. */}
          <div className="shrink-0 bg-surface-bright/95 backdrop-blur-md p-4 border-t-2 border-primary-container flex items-center gap-3">
            <div className="flex items-center border-2 border-primary rounded-xl overflow-hidden shrink-0">
              <button
                className="px-3 py-2 hover:bg-primary-container transition-colors"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                aria-label="Decrease quantity"
              >
                −
              </button>
              <span className="px-3 font-bold">{qty}</span>
              <button
                className="px-3 py-2 hover:bg-primary-container transition-colors"
                onClick={() => setQty((q) => Math.min(product.stockCount, q + 1))}
                aria-label="Increase quantity"
              >
                +
              </button>
            </div>
            <button
              onClick={() => {
                add(product.id, qty);
                onClose();
              }}
              className="flex-1 bg-candy-pink text-primary font-display-lg-mobile text-[18px] py-3 rounded-xl shadow-[4px_4px_0px_#864d61] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <Icon name="shopping_cart" />
              Add to Cart
            </button>
            {/* Uses the shared hook rather than <WishlistHeart />, which is
                absolutely positioned for sitting on a product photo. */}
            <button
              onClick={() => void saveToggle(product.id)}
              aria-label={`${saved ? "Remove" : "Save"} ${product.name}`}
              aria-pressed={saved}
              className={`shrink-0 w-12 h-12 rounded-xl border-2 border-primary flex items-center justify-center hover:scale-105 active:scale-95 transition-all ${
                saved ? "bg-primary-container text-primary" : "bg-white text-candy-pink hover:text-primary"
              }`}
            >
              <Icon name="favorite" filled={saved} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
