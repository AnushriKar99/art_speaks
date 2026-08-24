/**
 * The two Supabase values every client needs, read once and checked.
 *
 * READ THIS BEFORE CHANGING HOW THE VALUES ARE ACCESSED
 *
 * The references below must stay written out in full — `process.env.NEXT_PUBLIC_
 * SUPABASE_URL`, statically, exactly like that. The bundler finds those literal
 * strings and substitutes the value into the browser bundle at build time.
 * There is no `process.env` object in a browser; the inlining is the entire
 * mechanism.
 *
 * An earlier version of this file read `process.env[name]` with a computed key
 * to avoid repeating itself. A computed key cannot be matched by the bundler,
 * so nothing was inlined, and every client-side read returned undefined. The
 * server rendered the page correctly — where `process.env` is real — and then
 * hydration threw, React swapped in its error boundary, and the deployed site
 * showed "This page couldn't load" on a page whose HTML was perfectly fine.
 *
 * Repetition is the price of being statically analysable. Pay it.
 *
 * WHY THE CHECK EXISTS AT ALL
 *
 * These used to be read inline as `process.env.NEXT_PUBLIC_SUPABASE_URL!` in
 * four files. The `!` tells TypeScript the value exists and does nothing at
 * runtime, so a missing variable reached supabase-js as `undefined`:
 *
 *     Error: supabaseUrl is required.
 *         at <unknown> (.next/server/chunks/ssr/_1j6l_yv._.js:24:51879)
 *
 * — naming neither the variable nor where it should have come from.
 *
 * `/about` and the storefront pages are statically prerendered and query
 * Supabase to do it, so these must be present when `next build` runs, not only
 * when a request arrives. On a host like Vercel that means setting them before
 * the first build, and enabling them for the environment being built: a Preview
 * deploy with only Production ticked fails exactly like an unset variable.
 */

// Static, literal, and deliberately repetitive. See above.
const URL_VALUE = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY_VALUE = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function required(name: string, value: string | undefined): string {
  if (value) return value;

  // Only meaningful on the server, where process.env is a real object. In the
  // browser there is nothing to enumerate, so say that rather than printing an
  // empty list that reads as "no variables were set" — which is what sent this
  // investigation the wrong way once already.
  const onServer = typeof window === "undefined";
  const seen = onServer
    ? Object.keys(process.env)
        .filter((k) => k.startsWith("NEXT_PUBLIC_") && process.env[k])
        .sort()
    : null;

  throw new Error(
    `${name} is not set.\n\n` +
      `Static pages query Supabase while they are being prerendered, so this ` +
      `must exist before \`next build\` runs — not just at request time.\n\n` +
      (seen
        ? `NEXT_PUBLIC_ variables visible to this build: ` +
          `${seen.length ? seen.join(", ") : "(none)"}\n\n` +
          `If that list is empty, no environment reached the build at all. If ` +
          `it lists others but not this one, check the spelling and that it is ` +
          `enabled for the environment being built (Production, Preview and ` +
          `Development are separate). Rebuild without the build cache either ` +
          `way: NEXT_PUBLIC_ values are inlined at build time.`
        : `This is the browser, where the value should have been inlined into ` +
          `the bundle at build time. If it is missing here but the server ` +
          `rendered fine, the variable was absent when this bundle was built — ` +
          `set it and rebuild without the build cache.`),
  );
}

/**
 * A present-but-wrong URL is worse than a missing one.
 *
 * Missing throws immediately and says so. Wrong sails through every check here
 * and through supabase-js — which only refuses an EMPTY url — and then fails at
 * runtime as a 404 against whatever host was given, with no error in the
 * console and no clue what happened.
 *
 * That is not hypothetical. NEXT_PUBLIC_SUPABASE_URL was once set to the site's
 * own domain, presumably pasted into the wrong field alongside
 * NEXT_PUBLIC_SITE_URL. Every request then went to
 * `https://www.artspeaks.shop/auth/v1/token` — a 404 — so login silently failed
 * and the storefront rendered "No pieces in this category yet", because the
 * data-layer catch turns a failed query into an empty list.
 *
 * Checking the shape at build time turns a silent, hours-long runtime
 * investigation into a build log that names the value.
 */
function assertSupabaseHost(value: string): string {
  let host: string;
  try {
    host = new global.URL(value).host;
  } catch {
    throw new Error(
      `NEXT_PUBLIC_SUPABASE_URL is not a valid URL.\n\n` +
        `  got: ${JSON.stringify(value)}\n\n` +
        `Expected the Supabase project URL, e.g. https://xxxx.supabase.co`,
    );
  }

  // Self-hosted Supabase would not match, hence the escape hatch rather than a
  // hard rule. Nothing here is self-hosted today.
  if (!host.endsWith(".supabase.co") && !process.env.SUPABASE_ALLOW_ANY_HOST) {
    throw new Error(
      `NEXT_PUBLIC_SUPABASE_URL does not look like a Supabase project.\n\n` +
        `  got:      ${value}\n` +
        `  expected: https://<project-ref>.supabase.co\n\n` +
        `This is almost always NEXT_PUBLIC_SITE_URL pasted into the wrong ` +
        `field. They are both URLs and both name the site, so it is an easy ` +
        `swap — and it fails silently: supabase-js accepts any non-empty ` +
        `string, so requests just 404 against the wrong host and the ` +
        `storefront renders as empty.\n\n` +
        `Set NEXT_PUBLIC_SUPABASE_URL to the project URL from Supabase → ` +
        `Project Settings → API, then rebuild WITHOUT the build cache — ` +
        `NEXT_PUBLIC_ values are inlined at build time, so a cached build ` +
        `keeps the old one.\n\n` +
        `(Set SUPABASE_ALLOW_ANY_HOST=1 if this is genuinely self-hosted.)`,
    );
  }
  return value;
}

export const SUPABASE_URL = () =>
  assertSupabaseHost(required("NEXT_PUBLIC_SUPABASE_URL", URL_VALUE));
export const SUPABASE_ANON_KEY = () =>
  required("NEXT_PUBLIC_SUPABASE_ANON_KEY", ANON_KEY_VALUE);
