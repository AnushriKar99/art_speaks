import { type NextRequest, NextResponse } from "next/server";
import { verifyEmailLink } from "@/lib/auth/verify-email-link";
import { safeRedirectPath } from "@/lib/safe-redirect";

/**
 * Lands the link from a signup confirmation email and turns it into a session.
 *
 * The verification itself lives in lib/auth/verify-email-link, shared with
 * /auth/reset.
 *
 * `next` is honoured here but must not be relied on for anything that matters:
 * when Supabase's own /auth/v1/verify sits in the middle of the flow it
 * redirects to `redirect_to` with its own parameters appended, and a query
 * string put there does not reliably survive. That is why password reset has
 * its own route with the destination in the path instead.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const destination = safeRedirectPath(searchParams.get("next"), request.url);

  const result = await verifyEmailLink(request);

  if (!result.ok) {
    return NextResponse.redirect(
      new URL(
        `/login?error=confirm&reason=${encodeURIComponent(result.reason)}`,
        request.url,
      ),
    );
  }

  return NextResponse.redirect(new URL(destination, request.url));
}
