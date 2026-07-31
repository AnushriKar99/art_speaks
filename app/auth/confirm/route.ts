import type { EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Lands the confirmation link from a signup email.
 *
 * Supabase mails a URL carrying a one-time token_hash; exchanging it here sets
 * the session cookie, so the visitor arrives already signed in. Without this
 * route the link has nowhere to go and every new account stays unconfirmed.
 *
 * Requires the site URL and this path to be listed under
 * Authentication → URL Configuration in the Supabase dashboard.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next");

  // Same-site paths only — the token is spent by the time we redirect, but an
  // attacker-supplied `next` would still bounce a freshly signed-in visitor
  // off to another origin.
  const destination = next && next.startsWith("/") && !next.startsWith("//") ? next : "/";

  if (tokenHash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) {
      return NextResponse.redirect(new URL(destination, request.url));
    }
  }

  return NextResponse.redirect(new URL("/login?error=confirm", request.url));
}
