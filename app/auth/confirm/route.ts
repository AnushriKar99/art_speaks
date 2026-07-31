import type { EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Same-site paths only, so a crafted link can't bounce a freshly signed-in visitor off-origin. */
function safeDestination(next: string | null) {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
}

/**
 * Lands the link from a confirmation email and turns it into a session.
 *
 * Supabase can arrive here two different ways, and which one you get depends on
 * the email template:
 *
 *  - `?code=…`       The DEFAULT template. {{ .ConfirmationURL }} points at
 *                    Supabase's own /auth/v1/verify, which consumes the token
 *                    and then redirects here with a PKCE code. Exchanging it
 *                    needs the verifier cookie set during signup, so this path
 *                    only works in the browser that signed up.
 *
 *  - `?token_hash=…` A CUSTOMISED template pointing straight here. No verifier
 *                    needed, so it survives signing up on a laptop and opening
 *                    the email on a phone. Preferred — see the template in
 *                    docs/superpowers/specs (Phase 2 notes).
 *
 * Both are handled so confirmation works whichever template is in place.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const destination = safeDestination(searchParams.get("next"));

  const fail = (reason: string) =>
    NextResponse.redirect(
      new URL(`/login?error=confirm&reason=${encodeURIComponent(reason)}`, request.url),
    );

  // Supabase reports its own failures on the query string — an genuinely
  // expired link, or a redirect_to that isn't on the allow-list.
  const providerError =
    searchParams.get("error_description") ??
    searchParams.get("error_code") ??
    searchParams.get("error");
  if (providerError) return fail(providerError);

  const supabase = await createClient();

  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) return NextResponse.redirect(new URL(destination, request.url));
    return fail(error.message);
  }

  const code = searchParams.get("code");
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(destination, request.url));
    return fail(error.message);
  }

  return fail("no token in link");
}
