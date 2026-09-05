/**
 * "Sold out", written across a product's photo.
 *
 * Nothing on a card said a piece had gone. The cart button dimmed to 50% and
 * its aria-label changed, which a screen reader caught and nobody else did —
 * so a sold-out piece looked exactly like one you could buy until you tapped
 * it and nothing happened.
 *
 * One component rather than three copies, for the same reason StockBadge is
 * one: the shop grid, the best-seller carousel and the new-arrivals carousel
 * each build their own card, and three hand-written overlays would drift.
 *
 * Sits at z-5 so it passes under the wishlist heart and the cart button, which
 * are both z-10. Covering them would be wrong — a sold-out piece is still
 * worth saving to a wishlist, and the disabled cart button is what explains
 * why it cannot be added.
 *
 * The parent must be `relative`; every card's image box already is.
 */
export function SoldOutOverlay({ stockCount }: { stockCount: number }) {
  if (stockCount > 0) return null;

  return (
    <div className="absolute inset-0 z-[5] flex items-center justify-center bg-surface-bright/60 backdrop-blur-[1px]">
      {/* Tilted and shadowed like the rest of the stickers on the site, so it
          reads as something stuck on the photo rather than a failed image. */}
      <span className="-rotate-6 rounded-2xl border-2 border-primary bg-surface-bright px-4 py-1.5 font-label-caps text-label-lg uppercase tracking-widest text-primary shadow-[3px_3px_0px_#864d61]">
        Sold out
      </span>
    </div>
  );
}
