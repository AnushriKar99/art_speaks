"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";

type Toast = { message: string; action?: { href: string; label: string } };

const ToastContext = createContext<{
  show: (t: Toast) => void;
} | null>(null);

/**
 * A single transient message at the bottom of the screen.
 *
 * Exists because a heart button can be tapped from anywhere — a carousel, the
 * shop grid, a modal — and "you need to sign in" has to be visible wherever
 * that happened. Putting the message inside the card would hide it behind the
 * very thing being clicked.
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null);

  const show = useCallback((t: Toast) => setToast(t), []);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 4000);
    return () => window.clearTimeout(id);
  }, [toast]);

  const value = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          // Sits above the bottom tab bar so it is never hidden behind it.
          className="fixed bottom-20 lg:bottom-6 left-1/2 -translate-x-1/2 z-[100] w-[min(24rem,calc(100vw-2rem))]"
        >
          <div className="flex items-center gap-3 bg-inverse-surface text-inverse-on-surface rounded-2xl shadow-xl px-4 py-3">
            <p className="text-body-md flex-1">{toast.message}</p>
            {toast.action && (
              <Link
                href={toast.action.href}
                className="text-body-md font-headline-md underline whitespace-nowrap"
                onClick={() => setToast(null)}
              >
                {toast.action.label}
              </Link>
            )}
            <button
              type="button"
              onClick={() => setToast(null)}
              aria-label="Dismiss"
              className="opacity-70 hover:opacity-100"
            >
              <Icon name="close" className="text-[18px]" />
            </button>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}
