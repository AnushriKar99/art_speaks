"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function LoginForm({ next }: { next: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      // Deliberately generic: distinguishing "no such account" from "wrong
      // password" would let anyone test whether an email is registered.
      setError("That email or password didn't work. Please try again.");
      setLoading(false);
      return;
    }

    // Full navigation so the server re-reads the fresh session cookie and the
    // guards (and the account menu) see the new session.
    router.push(next);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label
          htmlFor="email"
          className="block text-label-caps font-label-caps uppercase tracking-wide text-on-surface-variant mb-1.5"
        >
          Email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-2xl border-2 border-outline-variant bg-white px-4 py-3 text-body-md text-on-surface focus:border-primary focus:outline-none"
        />
      </div>

      <div>
        <label
          htmlFor="password"
          className="block text-label-caps font-label-caps uppercase tracking-wide text-on-surface-variant mb-1.5"
        >
          Password
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-2xl border-2 border-outline-variant bg-white px-4 py-3 text-body-md text-on-surface focus:border-primary focus:outline-none"
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
        className="tactile-button w-full rounded-2xl bg-primary text-on-primary font-headline-md py-3 text-body-lg disabled:opacity-60"
      >
        {loading ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
