/**
 * Turns a failed Supabase query into a thrown error rather than empty data.
 *
 * WHY THIS EXISTS
 *
 * Every read in lib/data used to do this:
 *
 *     if (error) {
 *       console.error("getCategories:", error.message);
 *       return [];
 *     }
 *
 * Twelve of them, identically. It reads as defensive — the page never crashes —
 * but it costs more than it saves, in three ways that compounded into a real
 * outage.
 *
 * 1. IT DESTROYS THE SYMPTOM. A failed query and a genuinely empty table render
 *    the same pixels. "No pieces in this category yet" means both "nothing is
 *    listed" and "the database is unreachable", so the screen tells nobody —
 *    customer or developer — which one is happening.
 *
 * 2. IT CACHES THE FAILURE. Most of these functions are wrapped in
 *    unstable_cache. Returning [] hands back a value that looks like a real
 *    answer, so it gets stored — for an hour, in the case of categories. A
 *    two-minute misconfiguration became an hour of missing categories that
 *    survived both the fix and a redeploy. A thrown error is never cached, so
 *    the next request simply retries.
 *
 * 3. IT HIDES A BUILD PROBLEM. Storefront pages are prerendered, so a broken
 *    query at build time bakes an empty catalogue into a static page and ships
 *    it. Failing the build is the better outcome: nobody wants a deploy made
 *    from data that could not be read.
 *
 * The app already has app/error.tsx — "Something went wrong. That's on us, not
 * you" with a Try again button. It was simply never reached, because nothing
 * ever threw. This is what connects the two.
 *
 * WHAT THIS IS NOT FOR
 *
 * An empty result is not an error. A category with no products, a search with
 * no matches, a wishlist nobody has added to — those are ordinary states with
 * their own copy, and they must keep rendering normally.
 */
export class QueryError extends Error {
  constructor(source: string, message: string) {
    // The source is in the message so the error boundary's digest and the
    // server log both name the query that failed, not just "an error".
    super(`${source} failed: ${message}`);
    this.name = "QueryError";
  }
}

/**
 * Throws if a Supabase response carried an error; otherwise returns the rows.
 *
 * `source` names the calling function, so a production log says which read
 * broke rather than leaving someone to guess from a stack of minified frames.
 */
export function unwrap<T>(
  source: string,
  result: { data: T | null; error: { message: string } | null },
): T {
  if (result.error) {
    // Kept, because the thrown error reaches app/error.tsx as an opaque digest
    // in production — the server log is where the actual message lives.
    console.error(`${source}:`, result.error.message);
    throw new QueryError(source, result.error.message);
  }
  // Supabase returns null data only alongside an error, so by here it is safe.
  // The cast keeps callers from having to re-assert what this already checked.
  return result.data as T;
}
