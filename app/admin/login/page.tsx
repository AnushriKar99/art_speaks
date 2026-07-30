"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AdminLoginPage() {
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
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError("That email or password didn't work. Please try again.");
      setLoading(false);
      return;
    }

    // Full navigation so the server re-reads the fresh session cookie and
    // runs the requireAdmin() guard on /admin.
    router.push("/admin");
    router.refresh();
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-margin-mobile bg-background">
      <div className="w-full max-w-sm bg-surface-container-lowest rounded-[2rem] p-8 border-2 border-candy-pink/30 shadow-xl">
        <div className="text-center mb-8">
          <h1 className="text-headline-md font-headline-md text-primary mb-1">
            Art Speaks
          </h1>
          <p className="text-body-md text-on-surface-variant">Admin sign in</p>
        </div>

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
      </div>
    </main>
  );
}
