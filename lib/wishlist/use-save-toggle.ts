"use client";

import { useCallback } from "react";
import { useWishlist } from "@/lib/wishlist/wishlist-store";
import { useToast } from "@/components/ui/toast";

/**
 * Saving needs an account, because a wishlist belongs to a person rather than
 * a browser. Rather than hiding the heart from signed-out visitors — which
 * makes the feature invisible — the button is always there and explains
 * itself, with a link straight to sign-in.
 */
export function useSaveToggle() {
  const wishlist = useWishlist();
  const { show } = useToast();

  const saveToggle = useCallback(
    async (productId: string) => {
      const ok = await wishlist.toggle(productId);
      if (!ok) {
        show({
          message: "Sign in to save pieces you like.",
          action: { href: "/login?next=/shop", label: "Sign in" },
        });
      }
    },
    [wishlist, show],
  );

  return { wishlist, saveToggle };
}
