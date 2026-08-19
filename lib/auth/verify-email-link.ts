import type { EmailOtpType } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export type VerifyResult = { ok: true } | { ok: false; reason: string };

/**
 * Turns the link from a Supabase email into a session.
 *
 * Supabase can arrive two different ways, and which one depends on the email
 * template:
 *
 *  - `?code=…`       The DEFAULT template. {{ .ConfirmationURL }} points at
 *                    Supabase's own /auth/v1/verify, which consumes the token
 *                    and redirects on with a PKCE code. Exchanging it needs the
 *                    verifier cookie from the browser that started the flow.
 *
 *  - `?token_hash=…` A CUSTOMISED template pointing straight at us. No verifier
 *                    needed, so it survives being opened on another device.
 *
 * Shared by the two landing routes rather than duplicated, because getting this
 * wrong fails silently — a link that half-works looks like an expired one.
 */
export async function verifyEmailLink(request: NextRequest): Promise<VerifyResult> {
  const { searchParams } = new URL(request.url);

  // Supabase reports its own failures on the query string — a genuinely
  // expired link, or a redirect_to that is not on the allow-list.
  const providerError =
    searchParams.get("error_description") ??
    searchParams.get("error_code") ??
    searchParams.get("error");
  if (providerError) return { ok: false, reason: providerError };

  const supabase = await createClient();

  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    return error ? { ok: false, reason: error.message } : { ok: true };
  }

  const code = searchParams.get("code");
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    return error ? { ok: false, reason: error.message } : { ok: true };
  }

  return { ok: false, reason: "no token in link" };
}
