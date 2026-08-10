"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * Saved pieces, stored in the `wishlist` table.
 *
 * Requires an account by design: the table keys on customer_id, so a saved
 * piece belongs to a person rather than a browser, and follows them between
 * phone and laptop.
 *
 * RLS (migration 0001) does the enforcing — a signed-in visitor can only read,
 * insert and delete their own rows. Nothing here is trusted to get that right;
 * the database refuses anything else regardless of what this code asks for.
 */
type WishlistValue = {
  ids: Set<string>;
  count: number;
  /** False until the first load resolves, so hearts don't flicker. */
  ready: boolean;
  signedIn: boolean;
  has: (productId: string) => boolean;
  /** Returns false when not signed in, so the caller can prompt. */
  toggle: (productId: string) => Promise<boolean>;
};

const WishlistContext = createContext<WishlistValue | null>(null);

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ids, setIds] = useState<Set<string>>(new Set());
  const [ready, setReady] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    async function load(uid: string | null) {
      if (!uid) {
        if (!cancelled) {
          setIds(new Set());
          setReady(true);
        }
        return;
      }
      const { data } = await supabase
        .from("wishlist")
        .select("product_id")
        .eq("customer_id", uid);
      if (cancelled) return;
      setIds(new Set((data ?? []).map((r) => r.product_id as string)));
      setReady(true);
    }

    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (cancelled) return;
      setUserId(user?.id ?? null);
      await load(user?.id ?? null);
    })();

    // Signing in or out mid-session should swap the list rather than leave a
    // stale one on screen.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const uid = session?.user?.id ?? null;
      setUserId(uid);
      void load(uid);
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  const toggle = useCallback(
    async (productId: string): Promise<boolean> => {
      if (!userId) return false;

      const supabase = createClient();
      const saved = ids.has(productId);

      // Optimistic: the heart responds immediately and is put back if the
      // write fails, rather than waiting on a round trip to acknowledge a tap.
      setIds((prev) => {
        const next = new Set(prev);
        if (saved) next.delete(productId);
        else next.add(productId);
        return next;
      });

      const { error } = saved
        ? await supabase
            .from("wishlist")
            .delete()
            .eq("customer_id", userId)
            .eq("product_id", productId)
        : await supabase
            .from("wishlist")
            .insert({ customer_id: userId, product_id: productId });

      if (error) {
        console.error("wishlist toggle:", error.message);
        setIds((prev) => {
          const next = new Set(prev);
          if (saved) next.add(productId);
          else next.delete(productId);
          return next;
        });
        return true;
      }

      // The saved-pieces list is server-rendered, so unfilling a heart there
      // would otherwise leave the card on screen. Refresh only on that page —
      // anywhere else the product should stay visible, and a refetch would be
      // a wasted round trip.
      //
      // Read from location rather than useSearchParams: this provider wraps
      // the whole app, and subscribing to search params at render time forces
      // every page behind a Suspense boundary. Here it is a one-off lookup
      // inside an event handler, which costs nothing.
      const onWishlistPage =
        window.location.pathname === "/shop" &&
        new URLSearchParams(window.location.search).get("collection") ===
          "wishlist";
      if (onWishlistPage) router.refresh();

      return true;
    },
    [ids, userId, router],
  );

  const value = useMemo<WishlistValue>(
    () => ({
      ids,
      count: ids.size,
      ready,
      signedIn: Boolean(userId),
      has: (productId: string) => ids.has(productId),
      toggle,
    }),
    [ids, ready, userId, toggle],
  );

  return (
    <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>
  );
}

export function useWishlist(): WishlistValue {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error("useWishlist must be used inside <WishlistProvider>");
  return ctx;
}
