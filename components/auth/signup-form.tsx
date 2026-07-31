"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

const fieldClasses =
  "w-full rounded-2xl border-2 border-outline-variant bg-white px-4 py-3 text-body-md text-on-surface focus:border-primary focus:outline-none";
const labelClasses =
  "block text-label-caps font-label-caps uppercase tracking-wide text-on-surface-variant mb-1.5";

export function SignupForm() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Use at least 8 characters for your password.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // handle_new_user (migration 0001) reads full_name off the user
        // metadata to fill in the profiles row.
        data: { full_name: fullName },
        emailRedirectTo: `${window.location.origin}/auth/confirm?next=/`,
      },
    });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    // Supabase returns success even when the address is already registered —
    // that's deliberate, so this form can't be used to discover who has an
    // account. Either way the honest thing to show is "go check your email".
    setSent(true);
  }

  if (sent) {
    return (
      <div className="text-center" role="status">
        <p className="text-4xl mb-3">💌</p>
        <h2 className="font-headline-md text-headline-md text-primary mb-2">
          Check your email
        </h2>
        <p className="text-body-md text-on-surface-variant">
          We sent a confirmation link to <strong>{email}</strong>. Open it and
          you&apos;re in.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label htmlFor="fullName" className={labelClasses}>
          Name
        </label>
        <input
          id="fullName"
          type="text"
          autoComplete="name"
          required
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className={fieldClasses}
        />
      </div>

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

      <div>
        <label htmlFor="password" className={labelClasses}>
          Password
        </label>
        <input
          id="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={fieldClasses}
        />
        <p className="text-body-md text-on-surface-variant mt-1.5 text-[13px]">
          At least 8 characters.
        </p>
      </div>

      {error && (
        <p className="text-body-md text-error" role="alert">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="tactile-button w-full rounded-2xl bg-primary text-on-primary font-headline-md py-3 text-body-lg disabled:opacity-60"
      >
        {loading ? "Creating account…" : "Create account"}
      </button>
    </form>
  );
}
