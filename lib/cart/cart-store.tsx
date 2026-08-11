"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";

const STORAGE_KEY = "art-speaks-cart";

/**
 * A basket line. Deliberately stores only the product id and a quantity —
 * never the name or price.
 *
 * Prices change, and a cart that remembered what something cost last week would
 * quietly show the wrong amount. Everything else is looked up fresh from the
 * database when the basket is displayed.
 */
export type CartLine = { productId: string; quantity: number };

/**
 * localStorage is an external store that does not exist during server
 * rendering, which is precisely what useSyncExternalStore is for. Reading it in
 * an effect and calling setState would work, but it renders once with the wrong
 * value and then again with the right one — the flash of an empty basket on
 * every page load.
 *
 * getSnapshot must return a STABLE reference or React re-renders forever, so
 * the parsed array is cached and only replaced when the underlying data changes.
 */
const EMPTY: CartLine[] = [];
let cache: CartLine[] = EMPTY;
let cachedRaw: string | null = null;
const listeners = new Set<() => void>();

function parse(raw: string | null): CartLine[] {
  if (!raw) return EMPTY;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return EMPTY;
    // Anything can end up in localStorage — another tab, an older version of
    // the site, someone poking at devtools. Keep only what still looks valid.
    return parsed.filter(
      (l): l is CartLine =>
        typeof l === "object" &&
        l !== null &&
        typeof (l as CartLine).productId === "string" &&
        typeof (l as CartLine).quantity === "number" &&
        (l as CartLine).quantity > 0,
    );
  } catch {
    return EMPTY;
  }
}

function getSnapshot(): CartLine[] {
  // Reading localStorage can THROW, not just return null — Safari with
  // cross-site tracking restrictions, Firefox strict mode, some webviews and
  // corporate policies all raise SecurityError on access.
  //
  // This is the useSyncExternalStore snapshot, so a throw here propagates
  // during render and takes down every page that mounts the cart provider,
  // not merely the cart. A visitor with storage blocked would see a blank
  // error page on the homepage.
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return EMPTY;
  }
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cache = parse(raw);
  }
  return cache;
}

/** Always empty on the server — there is no basket until the browser says so. */
function getServerSnapshot(): CartLine[] {
  return EMPTY;
}

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  // `storage` fires in OTHER tabs, keeping two open windows in step.
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

function write(next: CartLine[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Private browsing can refuse writes. The basket still works for this
    // visit; it just will not survive a reload.
  }
  cachedRaw = JSON.stringify(next);
  cache = next;
  listeners.forEach((l) => l());
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  // No provider state to hold — the store lives in localStorage. Kept as a
  // component so the mount point stays obvious in the layout.
  return <>{children}</>;
}

export function useCart() {
  const lines = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const add = useCallback((productId: string, quantity = 1) => {
    const current = getSnapshot();
    const existing = current.find((l) => l.productId === productId);
    write(
      existing
        ? current.map((l) =>
            l.productId === productId
              ? { ...l, quantity: l.quantity + quantity }
              : l,
          )
        : [...current, { productId, quantity }],
    );
  }, []);

  const setQuantity = useCallback((productId: string, quantity: number) => {
    const current = getSnapshot();
    write(
      quantity <= 0
        ? current.filter((l) => l.productId !== productId)
        : current.map((l) =>
            l.productId === productId ? { ...l, quantity } : l,
          ),
    );
  }, []);

  const remove = useCallback((productId: string) => {
    write(getSnapshot().filter((l) => l.productId !== productId));
  }, []);

  const clear = useCallback(() => write([]), []);

  return useMemo(
    () => ({
      lines,
      count: lines.reduce((n, l) => n + l.quantity, 0),
      add,
      setQuantity,
      remove,
      clear,
    }),
    [lines, add, setQuantity, remove, clear],
  );
}
