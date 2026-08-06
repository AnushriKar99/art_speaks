"use client";

import { useCart } from "@/lib/cart/cart-store";

/**
 * The little count on the basket icon.
 *
 * Renders nothing when the basket is empty — a badge showing "0" is noise, and
 * during server rendering the count is always 0 because localStorage does not
 * exist yet. Hiding it in that case means no flash of a wrong number.
 */
export function CartBadge({ className = "" }: { className?: string }) {
  const { count } = useCart();
  if (count === 0) return null;

  return (
    <span
      aria-label={`${count} in basket`}
      className={`absolute -top-1 -right-1 min-w-4 h-4 px-1 bg-candy-pink text-on-primary-container text-[10px] flex items-center justify-center rounded-full font-bold ${className}`}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}
