import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

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

  // Already signed in but sitting on /login or /signup → send them on. Honour
  // ?next= so an admin who was bounced from /admin lands back there, and
  // default to the storefront otherwise. Only same-site paths, so this can't
  // be used as an open redirect.
  if ((pathname === "/login" || pathname === "/signup") && user) {
    const next = request.nextUrl.searchParams.get("next");
    const url = request.nextUrl.clone();
    url.pathname = next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}
