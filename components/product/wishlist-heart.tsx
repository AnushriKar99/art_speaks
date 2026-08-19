"use client";

import { Icon } from "@/components/ui/icon";
import { useSaveToggle } from "@/lib/wishlist/use-save-toggle";

/**
 * The save-to-wishlist heart that sits on a product image.
 *
 * Extracted because there were three copies — one on the shop card and two in
 * the homepage carousels — identical but for their corner offset. Restyling the
 * saved state updated one of them and left the other two behind, which is
 * exactly the drift a shared component prevents.
 *
 * Saved and unsaved used to differ only by the icon's fill, both in
 * text-candy-pink. A pale pink heart on white reads as a disabled control
 * rather than an active one, so the states now differ in weight too: saved
 * takes the deep primary on a tinted disc, unsaved keeps the light outline on
 * white.
 *
 * `position` carries the corner offset, which is the only thing that legitimately
 * varies between the places this appears.
 */
export function WishlistHeart({
  productId,
  productName,
  position = "top-3 right-3",
}: {
  productId: string;
  productName: string;
  /** Tailwind positioning classes — the cards sit it at slightly different insets. */
  position?: string;
}) {
  const { wishlist, saveToggle } = useSaveToggle();
  const saved = wishlist.has(productId);

  return (
    <button
      type="button"
      // The click that opens the product modal lives on the card behind this.
      onClick={(e) => {
        e.stopPropagation();
        void saveToggle(productId);
      }}
      aria-label={`${saved ? "Remove" : "Save"} ${productName}`}
      aria-pressed={saved}
      className={`absolute ${position} w-10 h-10 rounded-full flex items-center justify-center shadow-sm hover:scale-110 active:scale-95 transition-all z-10 ${
        saved
          ? "bg-primary-container text-primary"
          : "bg-white text-candy-pink hover:text-primary"
      }`}
    >
      <Icon name="favorite" className="text-[20px]" filled={saved} />
    </button>
  );
}
