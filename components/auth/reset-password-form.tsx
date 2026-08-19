"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const fieldClasses =
  "w-full rounded-2xl border-2 border-outline-variant bg-white px-4 py-3 text-body-md text-on-surface focus:border-primary focus:outline-none";
const labelClasses =
  "block text-label-caps font-label-caps uppercase tracking-wide text-on-surface-variant mb-1.5";

export function ResetPasswordForm({ reason }: { reason?: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState<boolean | null>(null);

  /**
   * Opening the recovery link puts a real session in place — that session is
   * what authorises the change, since there is no old password to check.
   *
   * So this page has to confirm one exists before showing the form. Arriving
   * here directly, or on a link that has already been used, would otherwise
   * offer a form whose submit could only fail.
   */
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => setReady(Boolean(data.session)));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Use at least 8 characters for your password.");
      return;
    }
    if (password !== confirm) {
      setError("Those two passwords don't match.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    // Already signed in as a side effect of the recovery link, so there is
    // nothing more to do. refresh() so the server re-reads the session and the
    // account menu updates.
    router.push("/");
    router.refresh();
  }

  if (ready === null) {
    return (
      <p className="text-body-md text-on-surface-variant text-center">
        Checking your link…
      </p>
    );
  }

  if (!ready) {
    return (
      <div className="text-center" role="alert">
        <p className="text-4xl mb-3">🔗</p>
        <h2 className="font-headline-md text-headline-md text-primary mb-2">
          That link has expired
        </h2>
        <p className="text-body-md text-on-surface-variant mb-5">
          Reset links only work once, and not for long. Ask for a fresh one and
          it&apos;ll be along shortly.
        </p>
        {reason && (
          <p className="text-[13px] text-on-surface-variant opacity-70 mb-5">
            Reason: {reason}
          </p>
        )}
        <a
          href="/forgot-password"
          className="inline-block bg-primary text-on-primary font-headline-md text-body-md py-3 px-6 rounded-full tactile-button"
        >
          Send a new link
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label htmlFor="password" className={labelClasses}>
          New password
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
        <p className="text-[13px] text-on-surface-variant mt-1.5">
          At least 8 characters.
        </p>
      </div>
      <div>
        <label htmlFor="confirm" className={labelClasses}>
          Confirm new password
        </label>
        <input
          id="confirm"
          type="password"
          autoComplete="new-password"
          required
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
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
        {loading ? "Saving…" : "Set new password"}
      </button>
    </form>
  );
}
