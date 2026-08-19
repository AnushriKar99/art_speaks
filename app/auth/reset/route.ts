import { type NextRequest, NextResponse } from "next/server";
import { verifyEmailLink } from "@/lib/auth/verify-email-link";

/**
 * Where a password-reset email lands.
 *
 * A separate route from /auth/confirm purely so the destination lives in the
 * PATH rather than a query parameter.
 *
 * The first attempt pointed recovery mail at `/auth/confirm?next=/reset-password`
 * and it came out on the homepage. Supabase's own /auth/v1/verify consumes the
 * token and then redirects to `redirect_to`, appending its own parameters — and
 * the `next` we had put there did not survive the trip. `safeRedirectPath` fell
 * back to "/", exactly as it is supposed to when there is nothing to redirect
 * to, and the person was dropped on the homepage still not knowing their
 * password.
 *
 * A path cannot be dropped or reordered by whatever a third party does to the
 * query string, so this route needs nothing to arrive intact except the token
 * Supabase itself put there.
 */
export async function GET(request: NextRequest) {
  const result = await verifyEmailLink(request);

  if (!result.ok) {
    // Send them to /reset-password rather than /login: that page already
    // explains an expired recovery link and offers a fresh one, which is the
    // thing they need next.
    return NextResponse.redirect(
      new URL(
        `/reset-password?error=${encodeURIComponent(result.reason)}`,
        request.url,
      ),
    );
  }

  return NextResponse.redirect(new URL("/reset-password", request.url));
}
