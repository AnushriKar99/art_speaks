"use client";

import { useRef } from "react";
import { Icon } from "@/components/ui/icon";

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
      {/* Styled to match the Categories dropdown in the header — same
          label-caps font, same primary colour, same chevron — but still a real
          <select>.

          Rebuilding it as a button-and-panel like Categories would look
          identical and behave worse: a select brings the native picker on
          mobile, full keyboard support, combobox semantics for screen readers,
          and it keeps working before JavaScript loads. A custom panel would
          have to re-implement the first three and could not do the fourth,
          since only JS can open it.

          appearance-none drops the browser's own arrow so the chevron below can
          sit where the design wants it; pr-6 reserves the space. */}
      <div className="relative flex items-center">
        <select
          id="sort"
          name="sort"
          defaultValue={value}
          onChange={() => formRef.current?.requestSubmit()}
          // field-sizing-content makes the select as wide as its CURRENT value
          // rather than its longest option — without it, "Newest first" leaves
          // a gap where "Price: low to high" would reach, and the chevron
          // floats away from the text. Unsupported browsers fall back to the
          // longest-option width, which is merely the gap again, not a break.
          className="appearance-none field-sizing-content bg-transparent pr-6 text-primary font-label-caps text-label-caps uppercase tracking-wider cursor-pointer outline-none focus-visible:underline hover:text-candy-pink transition-colors"
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value || "default"} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <Icon
          name="expand_more"
          aria-hidden
          className="pointer-events-none absolute right-0 text-base text-primary"
        />
      </div>

      {/* Only reachable without JavaScript, where onChange never fires. Hidden
          from sighted users rather than removed, so the form is still
          submittable if scripts fail. */}
      <button type="submit" className="sr-only">
        Apply sort
      </button>
    </form>
  );
}
