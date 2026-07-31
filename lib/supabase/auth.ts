import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Returns the logged-in user (verified with Supabase), or null.
 * Use in Server Components to branch on auth state.
 */
export async function getUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/**
 * Guard for admin-only pages. Ensures the caller is (a) logged in and
 * (b) flagged is_admin in profiles. Redirects otherwise, so a page can
 * simply `await requireAdmin()` at the top and trust it's protected.
 *
 * This is the second of two locks: the middleware already blocked anyone
 * not logged in, and the database RLS blocks non-admins from writing —
 * this stops a logged-in non-admin from even seeing the admin UI.
 */
export async function requireAdmin() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/admin/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  // Logged in but not an admin. Send them to the storefront, NOT to
  // /admin/login — the middleware bounces any logged-in visitor off the login
  // page back to /admin, so redirecting there would loop until the browser
  // gives up with ERR_TOO_MANY_REDIRECTS.
  if (!profile?.is_admin) {
    redirect("/");
  }

  return user;
}
