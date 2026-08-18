"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { setOrderStatus } from "@/app/admin/(dashboard)/orders/actions";
import type { OrderStatus } from "@/lib/data/admin";
import { Icon } from "@/components/ui/icon";

export type NextAction = {
  to: OrderStatus;
  label: string;
  /** Present tense, shown while the write is in flight: "Cancelling…" */
  busyLabel: string;
  primary: boolean;
  /** Terminal and destructive — ask first. */
  confirm?: boolean;
};

export function OrderActions({
  orderId,
  orderNumber,
  actions,
  stockDeducted,
}: {
  orderId: string;
  orderNumber: number;
  actions: NextAction[];
  /** Whether cancelling will put units back on the shelf. */
  stockDeducted: boolean;
}) {
  // isPending covers the write AND the re-render it triggers, which is the
  // whole ~1s the studio was staring at an unchanged screen. Both are the
  // wait, so both should look like waiting.
  const [isPending, startTransition] = useTransition();
  const [running, setRunning] = useState<OrderStatus | null>(null);
  const [asking, setAsking] = useState<NextAction | null>(null);
  const [error, setError] = useState<string | null>(null);

  function run(action: NextAction) {
    setError(null);
    setAsking(null);
    setRunning(action.to);
    startTransition(async () => {
      const result = await setOrderStatus(orderId, action.to);
      if (!result.ok) setError(result.error);
      setRunning(null);
    });
  }

  const busy = isPending || running !== null;

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap gap-2">
        {actions.map((a) => {
          const isRunning = running === a.to;
          return (
            <button
              key={a.to}
              type="button"
              // Every button locks, not just the one clicked: a second status
              // change queued behind the first would race the re-render and
              // could land on a status the order has already left.
              disabled={busy}
              aria-busy={isRunning}
              onClick={() => (a.confirm ? setAsking(a) : run(a))}
              className={`${
                a.primary
                  ? "tactile-button rounded-2xl bg-primary text-on-primary font-headline-md px-4 py-2 text-body-md"
                  : "rounded-2xl border-2 border-outline-variant px-4 py-2 text-body-md text-on-surface-variant hover:border-error hover:text-error transition-colors"
              } disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-outline-variant disabled:hover:text-on-surface-variant`}
            >
              {isRunning ? (
                <span className="flex items-center gap-2">
                  <Spinner />
                  {a.busyLabel}
                </span>
              ) : (
                a.label
              )}
            </button>
          );
        })}
      </div>

      {error && (
        <p role="alert" className="text-body-md text-error text-right max-w-xs">
          {error}
        </p>
      )}

      {asking && (
        <ConfirmCancel
          orderNumber={orderNumber}
          stockDeducted={stockDeducted}
          onKeep={() => setAsking(null)}
          onConfirm={() => run(asking)}
        />
      )}
    </div>
  );
}

function Spinner() {
  return (
    <span
      aria-hidden
      className="inline-block w-3.5 h-3.5 rounded-full border-2 border-current border-t-transparent animate-spin"
    />
  );
}

/**
 * Asks before cancelling.
 *
 * Cancelled is terminal — nextActions offers nothing from it — so a misplaced
 * click on a card you were only reading ends that order with no way back
 * through the UI. Everything else on this card is reversible, which is why
 * this is the only action that asks.
 *
 * Follows the product modal's conventions: Escape closes, focus moves in and
 * is trapped, and it returns where it came from on close.
 */
function ConfirmCancel({
  orderNumber,
  stockDeducted,
  onKeep,
  onConfirm,
}: {
  orderNumber: number;
  stockDeducted: boolean;
  onKeep: () => void;
  onConfirm: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const keepRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const returnFocusTo = document.activeElement as HTMLElement | null;
    // Focus lands on "Keep order", not on the destructive button — a stray
    // Enter should do the safe thing.
    keepRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onKeep();
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;
      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled])',
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
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
      returnFocusTo?.focus();
    };
  }, [onKeep]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={onKeep}
    >
      <div
        ref={panelRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="cancel-order-title"
        aria-describedby="cancel-order-body"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-[2rem] border-4 border-candy-pink/40 bg-surface-container-lowest p-6 shadow-xl text-left"
      >
        <div className="flex items-start gap-3 mb-3">
          <Icon name="error" className="text-[28px] text-error shrink-0" />
          <h2
            id="cancel-order-title"
            className="font-headline-md text-headline-md text-primary leading-tight"
          >
            Cancel order #{orderNumber}?
          </h2>
        </div>

        <p
          id="cancel-order-body"
          className="text-body-md text-on-surface-variant mb-6"
        >
          {stockDeducted
            ? "The order stays on record and its stock goes back on the shelf. It cannot be reopened from here."
            : "The order stays on record, but it cannot be reopened from here."}
        </p>

        <div className="flex flex-wrap justify-end gap-2">
          <button
            ref={keepRef}
            type="button"
            onClick={onKeep}
            className="rounded-2xl border-2 border-outline-variant px-4 py-2 text-body-md text-on-surface-variant hover:border-primary hover:text-primary transition-colors"
          >
            Keep order
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="tactile-button rounded-2xl bg-error text-on-error font-headline-md px-4 py-2 text-body-md"
          >
            Cancel order
          </button>
        </div>
      </div>
    </div>
  );
}
