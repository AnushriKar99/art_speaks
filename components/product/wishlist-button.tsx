"use client";

import { Icon } from "@/components/ui/icon";
import { useSaveToggle } from "@/lib/wishlist/use-save-toggle";

/**
 * The wishlist control that sits in an action row, beside Add to Cart.
 *
 * Distinct from `<WishlistHeart />`, which is absolutely positioned to sit on
 * top of a product photo and cannot be dropped into a row of buttons. Shared
 * between the quick-view modal and the product page so the saved and unsaved
 * treatments cannot drift apart — the same drift that prompted extracting
 * WishlistHeart in the first place.
 *
 * Saving needs an account; `useSaveToggle` handles the signed-out case by
 * showing a toast with a link to sign in, so the button is always live.
 */
export function WishlistButton({
  productId,
  productName,
  label,
  className = "",
}: {
  productId: string;
  productName: string;
  /** Shown beside the heart. Icon-only when omitted. */
  label?: string;
  /** Shape and size — it sits next to different neighbours in each place. */
  className?: string;
}) {
  const { wishlist, saveToggle } = useSaveToggle();
  const saved = wishlist.has(productId);

  return (
    <button
      type="button"
      onClick={() => void saveToggle(productId)}
      aria-label={`${saved ? "Remove" : "Save"} ${productName}`}
      aria-pressed={saved}
      className={`shrink-0 flex items-center justify-center gap-2 border-2 border-primary transition-all hover:scale-105 active:scale-95 ${
        saved
          ? "bg-primary-container text-primary"
          : "bg-white text-candy-pink hover:text-primary"
      } ${className}`}
    >
      <Icon name="favorite" filled={saved} />
      {label ? (
        <span className="font-label-caps text-label-caps uppercase tracking-wider">
          {label}
        </span>
      ) : null}
    </button>
  );
}
