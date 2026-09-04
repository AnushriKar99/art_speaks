import { Icon } from "@/components/ui/icon";

/** Below this, say how many are left rather than a bare "In stock". */
const LOW_STOCK_AT = 5;

/**
 * "In stock" / "Only N left!" / sold out.
 *
 * Shared by the quick-view modal and the product page. They used to say it
 * differently — the page as a line of plain text, the modal as a badge — and
 * the modal had no sold-out state at all, so a piece with none left announced
 * "Only 0 left!". One component means the three states cannot drift again.
 */
export function StockBadge({
  stockCount,
  /** The page has room for a fuller sentence than the modal does. */
  soldOutLabel = "Sold out",
  className = "",
}: {
  stockCount: number;
  soldOutLabel?: string;
  className?: string;
}) {
  const shell = `inline-flex items-center gap-2 px-4 py-2 rounded-2xl border-2 ${className}`;

  if (stockCount === 0) {
    return (
      <div className={`${shell} bg-error-container/50 border-error/30`}>
        <Icon name="inventory_2" className="text-error" />
        <span className="font-label-caps text-on-error-container">{soldOutLabel}</span>
      </div>
    );
  }

  if (stockCount <= LOW_STOCK_AT) {
    return (
      <div className={`${shell} bg-lemon-yellow/50 border-lemon-yellow`}>
        <Icon name="inventory_2" className="text-tertiary" />
        <span className="font-label-caps text-on-tertiary-container">
          Only {stockCount} left!
        </span>
      </div>
    );
  }

  return (
    <div className={`${shell} bg-secondary-container/60 border-secondary-container`}>
      <Icon name="check_circle" className="text-secondary" />
      <span className="font-label-caps text-on-secondary-container">In stock</span>
    </div>
  );
}
