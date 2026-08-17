import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * The signed-in user's id and email, or null.
 *
 * Uses getClaims() rather than getUser(). Both verify the token — the
 * difference is where. getUser() asks the Auth server every time, which was
 * costing a full round trip on every authenticated request. getClaims()
 * verifies the signature locally against the project's JWKS, which this
 * project publishes (ES256), so no network call is made once that key set is
 * cached.
 *
 * This is not the "trust the cookie" shortcut. getSession() would be, and
 * remains unsafe. getClaims() checks the signature and expiry — it just does
 * the maths here instead of asking someone else to.
 *
 * cache() on top, so one render pays once however often it asks.
 */
export const getUser = cache(async () => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims?.sub) return null;
  return { id: data.claims.sub as string, email: data.claims.email as string | undefined };
});

/**
 * Reads the admin flag for the signed-in user.
 *
 * Not cached across requests, and it cannot be: unstable_cache forbids
 * cookies(), and RLS scopes profiles to auth.uid(), so a sessionless client
 * would read nothing. The cache() on requireAdmin below is what stops one
 * render asking twice.
 */
async function readAdminFlag(userId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", userId)
    .single();
  return Boolean(data?.is_admin);
}

/**
 * Guard for admin-only pages. Ensures the caller is (a) logged in and
 * (b) flagged is_admin in profiles. Redirects otherwise, so a page can
 * simply `await requireAdmin()` at the top and trust it's protected.
 *
 * This is the second of two locks: the middleware already blocked anyone
 * not logged in, and the database RLS blocks non-admins from writing —
 * this stops a logged-in non-admin from even seeing the admin UI.
 *
 * cache() means a single render pays for one check however many times it asks.
 * It does not span requests, so a Server Action and the re-render that follows
 * still check separately — which is correct, since the second is a fresh
 * request that must be authorised on its own.
 */
export const requireAdmin = cache(async () => {
  const user = await getUser();

  if (!user) {
    redirect("/admin/login");
  }

  // Logged in but not an admin. Send them to the storefront, NOT to
  // /admin/login — the middleware bounces any logged-in visitor off the login
  // page back to /admin, so redirecting there would loop until the browser
  // gives up with ERR_TOO_MANY_REDIRECTS.
  if (!(await readAdminFlag(user.id))) {
    redirect("/");
  }

  return user;
});
