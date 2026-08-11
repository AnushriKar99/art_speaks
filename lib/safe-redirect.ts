/**
 * Resolves a caller-supplied `?next=` into a destination that cannot leave this
 * site.
 *
 * The obvious check — `startsWith("/") && !startsWith("//")` — is not enough.
 * The WHATWG URL parser treats a backslash as a path separator for special
 * schemes, so `/\evil.com` passes that test and then resolves to
 * `https://evil.com/`. That is an open redirect, and it is worst on the pages
 * that use it: a link on the real domain, a real login form, and a hard
 * navigation to an attacker's clone at the moment the visitor has just proven
 * they will type a password.
 *
 * Parsing and comparing origins is the reliable test, because it asks the same
 * question the browser will: where does this actually go?
 *
 * Returns `pathname + search + hash`, so a destination carrying a query string
 * survives. Assigning a full path to `url.pathname` would percent-encode the
 * `?` and produce a 404 — `/shop?collection=wishlist` became
 * `/shop%3Fcollection=wishlist`.
 */
/**
 * Only ever used as the base to resolve against, and the result is returned as
 * a relative path — so the value itself never reaches a browser. Any fixed
 * origin works; a literal one keeps callers that have no request handy (Server
 * Components) from having to invent one.
 */
export const SITE_ORIGIN = "https://art-speaks.invalid";

export function safeRedirectPath(
  next: string | null | undefined,
  origin: string = SITE_ORIGIN,
  fallback = "/",
): string {
  if (!next) return fallback;
  try {
    const candidate = new URL(next, origin);
    if (candidate.origin !== new URL(origin).origin) return fallback;
    return `${candidate.pathname}${candidate.search}${candidate.hash}`;
  } catch {
    return fallback;
  }
}
