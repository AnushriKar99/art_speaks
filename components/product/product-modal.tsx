"use client";

import { useEffect, useRef, useState } from "react";
import { ProductImage } from "@/components/ui/product-image";
import type { Product } from "@/lib/types";
import { formatPrice } from "@/lib/types";
import { Icon } from "@/components/ui/icon";
import { useCart } from "@/lib/cart/cart-store";
import { WishlistHeart } from "@/components/product/wishlist-heart";
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
  const [qty, setQty] = useState(1);
  const [activeImage, setActiveImage] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);

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
    <div
      // Extra bottom clearance, not just symmetric padding: the site's own
      // bottom tab bar is fixed and floats independently of this modal (flush
      // 64px on mobile, a `bottom-4` pill on desktop), so centering with equal
      // padding on every side let the two overlap on shorter screens. Reserve
      // enough room below to clear it with margin at any viewport height.
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 pb-28 md:p-6 md:pb-28"
    >
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
        // A cap that scales down on short viewports instead of overflowing
        // them, and is capped in absolute terms so it doesn't balloon on a
        // tall monitor either — min() of the two, in one arbitrary value so
        // it applies the same way at every breakpoint. At 78vh, even a panel
        // tall enough to hit the cap still leaves ~11vh clear above and
        // below it, which is what keeps it off the floating bottom tab bar.
        className="relative bg-surface-bright w-full max-w-2xl max-h-[min(78vh,620px)] rounded-3xl shadow-2xl flex flex-col overflow-hidden border-4 border-primary outline-none"
      >
        <button
          className="absolute top-4 right-4 z-[110] bg-white w-10 h-10 flex items-center justify-center rounded-full text-primary shadow-md hover:scale-110 active:scale-90 transition-all border-2 border-primary"
          onClick={onClose}
          aria-label="Close"
        >
          <Icon name="close" />
        </button>

        {/* Image */}
        <div className="relative aspect-[4/3] sm:aspect-video shrink-0 bg-surface-container-high overflow-hidden">
          <ProductImage
            src={product.images[activeImage]}
            alt={product.name}
            sizes="(min-width: 768px) 42rem, 100vw"
            className="object-cover"
          />
          <WishlistHeart
            productId={product.id}
            productName={product.name}
            position="top-3 left-3"
          />
          {product.images.length > 1 ? (
            <div className="absolute bottom-3 left-0 w-full flex justify-center gap-2">
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

        {/* Details — scrolls independently so the action bar stays put */}
        <div className="flex-1 min-h-0 flex flex-col">
          <div className="flex-1 overflow-y-auto custom-scrollbar p-5 md:p-6">
            <div className="flex flex-col gap-4 mb-4">
              <div>
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
              {lowStock ? (
                <div className="flex items-center gap-2 bg-lemon-yellow/50 px-4 py-2 rounded-2xl border-2 border-lemon-yellow shrink-0 self-start">
                  <Icon name="inventory_2" className="text-tertiary" />
                  <span className="font-label-caps text-on-tertiary-container">
                    Only {product.stockCount} left!
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2 bg-secondary-container/60 px-4 py-2 rounded-2xl border-2 border-secondary-container shrink-0 self-start">
                  <Icon name="check_circle" className="text-secondary" />
                  <span className="font-label-caps text-on-secondary-container">
                    In stock
                  </span>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <h4 className="font-label-caps text-label-caps text-outline uppercase tracking-widest mb-2">
                  Description
                </h4>
                <p className="font-body-lg text-body-lg text-on-surface leading-relaxed">
                  {product.description}
                </p>
              </div>
              <div className="bg-surface-container p-4 rounded-2xl border-2 border-dashed border-primary/30">
                <h4 className="font-label-caps text-label-caps text-primary flex items-center gap-2 mb-2">
                  <Icon name="edit" className="text-sm" />
                  Artisan Notes
                </h4>
                <p className="font-body-md text-body-md text-on-surface-variant italic">
                  {product.artisanNote}
                </p>
              </div>
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

          {/* Action bar — part of the flex column, not floated over the
              content, so it never overlaps text on a short viewport. */}
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
                add(product.id, qty);
                onClose();
              }}
              className="flex-1 bg-candy-pink text-primary font-display-lg-mobile text-[18px] py-3 rounded-xl shadow-[4px_4px_0px_#864d61] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <Icon name="shopping_cart" />
              Add to Cart
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
