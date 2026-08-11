import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "@/components/auth/login-form";
import { safeRedirectPath, SITE_ORIGIN } from "@/lib/safe-redirect";

export const metadata: Metadata = {
  title: "Art Speaks | Sign in",
  description: "Sign in to your Art Speaks account.",
};

/**
 * One sign-in page for everyone. Admins land here too — what makes someone an
 * admin is the profiles.is_admin flag, not a different door. After signing in,
 * an admin sees an Admin Dashboard link in the header; everyone else carries on
 * shopping.
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string; reason?: string }>;
}) {
  const { next, error, reason } = await searchParams;

  // Resolved against our own origin — see lib/safe-redirect. A naive
  // startsWith("/") test lets `/\evil.com` through, which the URL parser
  // resolves off-site.
  const destination = safeRedirectPath(next, SITE_ORIGIN);

  return (
    <main className="min-h-screen flex items-center justify-center px-margin-mobile bg-background">
      <div className="w-full max-w-sm bg-surface-container-lowest rounded-[2rem] p-8 border-2 border-candy-pink/30 shadow-xl">
        <div className="text-center mb-8">
          <Link
            href="/"
            className="font-headline-md text-headline-md text-primary mb-1 inline-block"
          >
            Art Speaks
          </Link>
          <p className="text-body-md text-on-surface-variant">Sign in</p>
        </div>

        {error === "confirm" ? (
          <p
            className="text-body-md text-error bg-error-container/50 rounded-2xl px-4 py-3 mb-5"
            role="alert"
          >
            That confirmation link didn&apos;t work. Sign in below, or create
            the account again.
            {reason ? (
              <span className="block mt-1 text-[13px] opacity-70">
                Reason: {reason}
              </span>
            ) : null}
          </p>
        ) : null}

        <LoginForm next={destination} />

        <p className="text-body-md text-on-surface-variant text-center mt-6">
          New here?{" "}
          <Link href="/signup" className="underline hover:text-primary">
            Create an account
          </Link>
        </p>
        <p className="text-body-md text-on-surface-variant text-center mt-2">
          <Link href="/" className="underline hover:text-primary">
            Back to the shop
          </Link>
        </p>
      </div>
    </main>
  );
}
