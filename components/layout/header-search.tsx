"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/icon";

/**
 * The search box both headers drop into their own container.
 *
 * Shared because it is more than a text input: it carries the clear-on-empty
 * behaviour, its own ✕ (Firefox draws no native one, and the native one cannot
 * clear the category filter), and the plain-GET contract below. Only the form
 * is shared — the two headers wrap it differently, because ShopHeader is
 * `sticky` and grows in flow while SiteHeader is `fixed h-16` and cannot.
 */
export function HeaderSearch({
  query,
  autoFocus = true,
}: {
  /** Current `?q=`, so the box still shows what was searched for. */
  query?: string;
  autoFocus?: boolean;
}) {
  const router = useRouter();

  // One cross, and it clears everything — the search term and the category
  // filter both.
  //
  // This used to preserve the collection, on the reasoning that dropping
  // someone from "Bookmarks" to "All Items" discards a filter they never
  // touched. In practice the opposite reads better: a single ✕ that resets to
  // the full catalogue is one obvious thing, and landing on everything is never
  // a dead end — the categories are one tap away. Two controls that each
  // cleared a different amount was the confusing part.
  const clearedHref = "/shop";

  return (
    // A plain GET form, so the term lands in the URL as ?q=. That makes results
    // shareable and bookmarkable, keeps the back button honest, and means
    // search works before any JavaScript loads — including from the home page,
    // which has no results of its own and simply hands off to /shop.
    <form action="/shop" method="get" className="relative">
      <input
        type="search"
        name="q"
        defaultValue={query ?? ""}
        autoFocus={autoFocus}
        placeholder="Search the shop…"
        aria-label="Search products"
        // Emptying the box by hand drops the filter straight away, rather than
        // leaving stale results on screen until you press Enter. The native ✕
        // is hidden, so this now only covers deleting the text.
        onInput={(e) => {
          if (query && e.currentTarget.value === "") {
            router.push(clearedHref);
          }
        }}
        className="w-full bg-white border-2 border-candy-pink/20 rounded-full py-3 pl-5 pr-20 outline-none focus:border-primary text-body-md shadow-sm"
      />
      {query ? (
        // Ours, not the browser's. Firefox draws no native clear control at
        // all, and the native one cannot clear the category filter — it only
        // empties the field. The WebKit one is hidden in globals.css so only
        // this appears.
        <Link
          href={clearedHref}
          aria-label="Clear search"
          className="absolute right-11 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-primary transition-colors p-2"
        >
          <Icon name="close" className="text-[20px]" />
        </Link>
      ) : null}
      <button
        type="submit"
        aria-label="Search"
        className="absolute right-1.5 top-1/2 -translate-y-1/2 text-primary hover:scale-110 transition-transform active:scale-95 p-2"
      >
        <Icon name="search" />
      </button>
    </form>
  );
}
