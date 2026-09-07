"use client";

import { useCart } from "@/lib/cart/cart-store";
import { Icon } from "@/components/ui/icon";

/**
 * The cart control on a product card.
 *
 * Starts as a single icon button. Once the piece is in the basket it becomes a
 * − count + stepper, so the card itself answers "how many of these have I
 * already added?" — otherwise the only feedback is the header badge, which
 * says nothing about *this* product.
 *
 * Stops at the stock count: the checkout function refuses an order for more
 * than exists, so letting the button climb past it would only produce an error
 * later, at the point where it is most annoying.
 *
 * With none left it is not a cart control at all, but a "Sold out" marker. That
 * is checked before the basket, so a piece that sold out *after* it was added
 * cannot be topped up from the card either — the basket page is where such a
 * line gets removed, and it says so.
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
  const { lines, add, setQuantity } = useCart();
  const quantity = lines.find((l) => l.productId === productId)?.quantity ?? 0;
  // <= rather than ===: nothing should write a negative stock count, but if
  // something ever did, "sold out" is the honest reading of it.
  const soldOut = stockCount <= 0;

  const shell =
    "bg-white rounded-full flex items-center justify-center text-primary shadow-[4px_4px_0px_#864d61] transition-all z-10";

  if (soldOut) {
    // Says it in words rather than fading the cart icon. A faded icon is how
    // this looked before, and a disabled control that still resembles the
    // enabled one reads as a rendering glitch — so people tapped it, and the
    // card gave no reason why nothing happened. The offset shadow is dropped
    // too: nothing here is pressable, so nothing should look raised.
    return (
      <button
        type="button"
        disabled
        aria-label={`${productName} is sold out`}
        className={`bg-surface-container-high/95 backdrop-blur-sm border-2 border-outline-variant rounded-full flex items-center justify-center gap-1 h-10 px-3 text-outline cursor-not-allowed z-10 ${className}`}
      >
        <Icon name="remove_shopping_cart" className="text-[18px]" />
        <span className="font-label-caps text-[11px] uppercase tracking-wide">
          Sold out
        </span>
      </button>
    );
  }

  if (quantity === 0) {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          add(productId);
        }}
        aria-label={`Add ${productName} to cart`}
        className={`${shell} ${size} ${className} hover:translate-y-[-2px]`}
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
      className={`${shell} ${className} h-10 px-1 gap-1`}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setQuantity(productId, quantity - 1);
        }}
        // At one, this empties the line rather than decrementing to zero — so
        // the control returns to the plain cart icon and the card looks
        // untouched again.
        aria-label={
          quantity === 1
            ? `Remove ${productName} from cart`
            : `One fewer ${productName}`
        }
        // Matches the + button's usable state, so the pair reads as one
        // control rather than two differently-weighted ones.
        className="w-8 h-8 rounded-full flex items-center justify-center text-primary bg-primary-container/50 hover:bg-primary-container transition-colors"
      >
        <Icon name={quantity === 1 ? "delete" : "remove"} className="text-[20px]" />
      </button>
      <span
        className="font-headline-md text-body-md leading-none min-w-4 text-center"
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
        // The two states were text-primary against text-outline — close enough
        // in weight that "no more left" looked like an ordinary button. Now the
        // usable state carries a tinted disc and full-strength colour, and the
        // unusable one drops to a faint outline with no background at all.
        className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
          atLimit
            ? "text-outline-variant opacity-60 cursor-not-allowed"
            : "text-primary bg-primary-container/50 hover:bg-primary-container"
        }`}
      >
        <Icon name="add" className="text-[20px]" />
      </button>
    </div>
  );
}
