/**
 * The two Supabase values every client needs, read once and checked.
 *
 * These used to be read inline as `process.env.NEXT_PUBLIC_SUPABASE_URL!` in
 * four files. The `!` tells TypeScript the value exists and does nothing at
 * runtime, so a missing variable reached supabase-js as `undefined` and
 * surfaced as:
 *
 *     Error: supabaseUrl is required.
 *         at <unknown> (.next/server/chunks/ssr/_1j6l_yv._.js:24:51879)
 *
 * — in a minified build chunk, naming neither the variable nor where it should
 * have come from. That cost a deploy cycle to work out.
 *
 * WHY THIS BITES AT BUILD TIME
 *
 * `/about` and the storefront pages are statically prerendered, and they query
 * Supabase to do it. So these must be present when `next build` runs, not only
 * when a request arrives. On a host like Vercel that means the variables have
 * to exist in the project settings *before* the first build, and be enabled for
 * the environment being built — a Preview deploy with only Production ticked
 * fails exactly like an unset variable.
 *
 * NEXT_PUBLIC_ values are also inlined into the bundle at build time, so a
 * cached build keeps whatever they were when it was made.
 */

function required(name: "NEXT_PUBLIC_SUPABASE_URL" | "NEXT_PUBLIC_SUPABASE_ANON_KEY"): string {
  const value = process.env[name];
  if (value) return value;

  // Which NEXT_PUBLIC_ keys did make it through? That distinguishes "none of
  // the environment arrived" from "this one is misspelt or scoped to the wrong
  // environment", which need different fixes and otherwise look identical.
  //
  // Names only — never values. The anon key is public by design, but a build
  // log is not the place to start printing credentials by habit.
  // Non-empty only. A variable defined as "" is present in process.env but
  // useless, and listing it as visible would point the search in exactly the
  // wrong direction.
  const seen = Object.keys(process.env)
    .filter((k) => k.startsWith("NEXT_PUBLIC_") && process.env[k])
    .sort();

  throw new Error(
    `${name} is not set.\n\n` +
      `Static pages query Supabase while they are being prerendered, so this ` +
      `must exist before \`next build\` runs — not just at request time.\n\n` +
      `NEXT_PUBLIC_ variables visible to this build: ` +
      `${seen.length ? seen.join(", ") : "(none)"}\n\n` +
      `If that list is empty, no environment reached the build at all. If it ` +
      `lists others but not this one, check the spelling and that it is ` +
      `enabled for the environment being built (Production, Preview and ` +
      `Development are separate). Rebuild without the build cache either way: ` +
      `NEXT_PUBLIC_ values are inlined at build time.`,
  );
}

export const SUPABASE_URL = () => required("NEXT_PUBLIC_SUPABASE_URL");
export const SUPABASE_ANON_KEY = () => required("NEXT_PUBLIC_SUPABASE_ANON_KEY");
