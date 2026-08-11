import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { safeRedirectPath } from "@/lib/safe-redirect";

/**
 * Runs on every request (see proxy.ts). Two jobs:
 *  1. Keep the Supabase session fresh by syncing auth cookies onto the
 *     response — without this, Server Components can't read the session.
 *  2. Gate the /admin area: anyone who isn't logged in is sent to /login with
 *     a `next` param so they come back where they were headed. Whether the
 *     logged-in user is actually an admin is checked in the dashboard layout
 *     via requireAdmin — this only checks "logged in".
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // IMPORTANT: getUser() revalidates the token with Supabase (don't trust
  // getSession() here). This also refreshes the cookies via setAll above.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname, search } = request.nextUrl;

  // /admin/login is a legacy stub that redirects to /login. Gating it would
  // send a logged-out visitor to /login?next=/admin/login and bounce them
  // through it twice, so let it render its own redirect.
  const isLegacyAdminLogin = pathname === "/admin/login";

  // Not logged in and heading into the studio → sign in first, then resume.
  if (pathname.startsWith("/admin") && !isLegacyAdminLogin && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }

  // Already signed in but sitting on /login or /signup → send them on,
  // honouring ?next= so an admin bounced from /admin lands back there.
  //
  // Built with the URL constructor rather than by assigning to url.pathname:
  // that setter percent-encodes "?", so /shop?collection=wishlist became
  // /shop%3Fcollection=wishlist — a path that does not exist. Reachable in
  // normal use, since the wishlist empty state links exactly that.
  if ((pathname === "/login" || pathname === "/signup") && user) {
    const next = safeRedirectPath(
      request.nextUrl.searchParams.get("next"),
      request.nextUrl.origin,
    );
    return NextResponse.redirect(new URL(next, request.nextUrl.origin));
  }

  return response;
}
