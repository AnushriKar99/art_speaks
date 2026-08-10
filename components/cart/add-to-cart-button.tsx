"use client";

import { useCart } from "@/lib/cart/cart-store";
import { Icon } from "@/components/ui/icon";

/**
 * The cart control on a product card.
 *
 * Starts as a single icon button. Once the piece is in the basket it becomes a
 * count with a + beside it, so the card itself answers "how many of these have
 * I already added?" — otherwise the only feedback is the header badge, which
 * says nothing about *this* product.
 *
 * Stops at the stock count: the checkout function refuses an order for more
 * than exists, so letting the button climb past it would only produce an error
 * later, at the point where it is most annoying.
 */
export function AddToCartButton({
  productId,
  productName,
  stockCount,
  /** Tailwind size for the resting icon button — cards differ. */
  size = "w-10 h-10",
  className = "",
}: {
  productId: string;
  productName: string;
  stockCount: number;
  size?: string;
  className?: string;
}) {
  const { lines, add } = useCart();
  const quantity = lines.find((l) => l.productId === productId)?.quantity ?? 0;

  const shell =
    "bg-white rounded-full flex items-center justify-center text-primary shadow-[4px_4px_0px_#864d61] transition-all z-10";

  if (quantity === 0) {
    const soldOut = stockCount === 0;
    return (
      <button
        type="button"
        disabled={soldOut}
        onClick={(e) => {
          e.stopPropagation();
          add(productId);
        }}
        aria-label={soldOut ? `${productName} is sold out` : `Add ${productName} to cart`}
        className={`${shell} ${size} ${className} ${
          soldOut ? "opacity-50 cursor-not-allowed" : "hover:translate-y-[-2px]"
        }`}
      >
        <Icon name="add_shopping_cart" className="text-[20px]" />
      </button>
    );
  }

  const atLimit = quantity >= stockCount;

  return (
    <div
      // The click that opens the product modal lives on the card behind this,
      // so every interaction in here has to stop propagating.
      onClick={(e) => e.stopPropagation()}
      className={`${shell} ${className} h-10 pl-3 pr-1 gap-2`}
    >
      <span
        className="font-headline-md text-body-md leading-none"
        aria-label={`${quantity} in cart`}
      >
        {quantity}
      </span>
      <button
        type="button"
        disabled={atLimit}
        onClick={(e) => {
          e.stopPropagation();
          add(productId);
        }}
        aria-label={
          atLimit
            ? `No more ${productName} in stock`
            : `Add another ${productName}`
        }
        title={atLimit ? `Only ${stockCount} in stock` : undefined}
        className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
          atLimit
            ? "text-outline cursor-not-allowed"
            : "text-primary hover:bg-surface-container-high"
        }`}
      >
        <Icon name="add" className="text-[20px]" />
      </button>
    </div>
  );
}
