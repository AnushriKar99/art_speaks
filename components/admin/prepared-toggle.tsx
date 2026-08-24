"use client";

import { useOptimistic, useTransition } from "react";
import { setItemPrepared } from "@/app/admin/(dashboard)/orders/actions";
import { Icon } from "@/components/ui/icon";

/**
 * Marks one order line prepared. Studio bookkeeping only (0018) — has this
 * piece been made and set aside — with no bearing on the order's own status.
 *
 * useOptimistic rather than the confirm-and-wait pattern OrderActions uses for
 * status changes: a full round trip per tap would make ticking through a
 * six-item order feel like six separate page loads. Cancelling an order
 * happens once and is destructive, which earns a wait and a dialog; ticking a
 * box while packing does not, and a wrong tap costs one more tap to undo.
 *
 * Failure reverts silently rather than surfacing an error banner. This
 * component renders once per line item on a page that can list many orders at
 * once, and a banner per failed tick would compound fast; the toggle simply
 * springing back to its previous state already says the tap did not take.
 */
export function PreparedToggle({
  itemId,
  prepared,
}: {
  itemId: string;
  prepared: boolean;
}) {
  const [optimisticPrepared, setOptimisticPrepared] = useOptimistic(prepared);
  const [, startTransition] = useTransition();

  function toggle() {
    const next = !optimisticPrepared;
    startTransition(async () => {
      setOptimisticPrepared(next);
      const result = await setItemPrepared(itemId, next);
      if (!result.ok) {
        // No local rollback call needed: useOptimistic reverts to the real
        // `prepared` prop on its own once this transition ends without the
        // server value having changed to match.
        console.error("setItemPrepared:", result.error);
      }
    });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={optimisticPrepared}
      aria-label={
        optimisticPrepared ? "Mark as not prepared" : "Mark as prepared"
      }
      title={optimisticPrepared ? "Prepared" : "Not prepared yet"}
      className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center border-2 transition-colors ${
        optimisticPrepared
          ? "bg-secondary-container border-secondary text-on-secondary-container"
          : "border-outline-variant text-transparent hover:border-primary"
      }`}
    >
      <Icon name="check" className="text-[16px]" />
    </button>
  );
}
