"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

const fieldClasses =
  "w-full rounded-2xl border-2 border-outline-variant bg-white px-4 py-3 text-body-md text-on-surface focus:border-primary focus:outline-none";
const labelClasses =
  "block text-label-caps font-label-caps uppercase tracking-wide text-on-surface-variant mb-1.5";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    // A path, deliberately, with no query string to lose.
    //
    // This first pointed at `/auth/confirm?next=/reset-password` and came out
    // on the homepage: Supabase's own /auth/v1/verify consumes the token and
    // redirects to redirect_to with its own parameters appended, and the `next`
    // we had added did not survive. /auth/reset carries the destination in its
    // path, so nothing has to arrive intact except Supabase's own token.
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset`,
    });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    // Shown whether or not the address has an account. Saying "no account with
    // that email" would turn this form into a way of testing which addresses
    // are registered — the same reason the sign-in error is deliberately vague.
    setSent(true);
  }

  if (sent) {
    return (
      <div className="text-center" role="status">
        <p className="text-4xl mb-3">📬</p>
        <h2 className="font-headline-md text-headline-md text-primary mb-2">
          Check your email
        </h2>
        <p className="text-body-md text-on-surface-variant mb-4">
          If there&apos;s an account for <strong>{email}</strong>, a link to set
          a new password is on its way.
        </p>
        {/* Said plainly and up front. Reset mail currently goes through
            Supabase's shared sender, which is often filtered — someone who
            does not know to look in spam will conclude the site is broken. */}
        <p className="text-body-md text-on-surface-variant bg-surface-container-low rounded-2xl px-4 py-3">
          Not there after a minute? <strong>Check your spam folder</strong> — it
          often lands there. Still nothing, message the studio on WhatsApp and
          we&apos;ll sort it out.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <p className="text-body-md text-on-surface-variant">
        Enter the email you signed up with and we&apos;ll send a link to set a
        new password.
      </p>
      <div>
        <label htmlFor="email" className={labelClasses}>
          Email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={fieldClasses}
        />
      </div>

      {error && (
        <p className="text-body-md text-error" role="alert">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-primary text-on-primary font-headline-md text-body-md py-3 rounded-full tactile-button disabled:opacity-60"
      >
        {loading ? "Sending…" : "Send reset link"}
      </button>
    </form>
  );
}
