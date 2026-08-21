"use client";

import { useRef } from "react";

export const SORT_OPTIONS = [
  { value: "", label: "Newest first" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
] as const;

export type SortKey = (typeof SORT_OPTIONS)[number]["value"];

/**
 * Sort control for a collection.
 *
 * The default option is labelled "Newest first" because that is what the
 * default order actually is — every collection comes back created_at DESC.
 * It was nearly labelled "Relevance", which sounds right and is not: relevance
 * ranking only applies to search results, and none of these orderings is a
 * best-seller ranking (that is its own collection).
 *
 * A real GET form, like the search box, so the choice lands in the URL as
 * ?sort= — shareable, bookmarkable, honest with the back button, and it works
 * before any JavaScript loads. The onChange below is a convenience on top of
 * that, not the mechanism: without JS the visible submit button still applies
 * it.
 *
 * `collection` and `q` ride along as hidden inputs, because a GET form replaces
 * the whole query string. Without them, sorting inside "Bookmarks" or within a
 * set of search results would silently throw you back to the full catalogue.
 */
export function SortSelect({
  value,
  collection,
  query,
}: {
  value: SortKey;
  collection?: string;
  query?: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      action="/shop"
      method="get"
      className="flex items-center gap-2"
    >
      {collection ? (
        <input type="hidden" name="collection" value={collection} />
      ) : null}
      {query ? <input type="hidden" name="q" value={query} /> : null}

      <label
        htmlFor="sort"
        className="text-label-caps font-label-caps uppercase tracking-wide text-on-surface-variant whitespace-nowrap"
      >
        Sort by
      </label>
      <select
        id="sort"
        name="sort"
        defaultValue={value}
        onChange={() => formRef.current?.requestSubmit()}
        className="rounded-full border-2 border-candy-pink/30 bg-white py-2 pl-3 pr-8 text-body-md text-on-surface outline-none focus:border-primary shadow-sm cursor-pointer"
      >
        {SORT_OPTIONS.map((o) => (
          <option key={o.value || "relevance"} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>

      {/* Only reachable without JavaScript, where onChange never fires. Hidden
          from sighted users rather than removed, so the form is still
          submittable if scripts fail. */}
      <button type="submit" className="sr-only">
        Apply sort
      </button>
    </form>
  );
}
