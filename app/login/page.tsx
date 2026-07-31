import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Art Speaks | Sign in",
  description: "Sign in to your Art Speaks account.",
};

/**
 * One sign-in page for everyone. Admins land here too — what makes someone an
 * admin is the profiles.is_admin flag, not a different door. After signing in,
 * an admin sees a Studio link in the header; everyone else just carries on
 * shopping.
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  // Only same-site paths. Without this check, /login?next=https://evil.example
  // would turn our own login into an open redirect.
  const destination = next && next.startsWith("/") && !next.startsWith("//") ? next : "/";

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

        <LoginForm next={destination} />

        <p className="text-body-md text-on-surface-variant text-center mt-6">
          <Link href="/" className="underline hover:text-primary">
            Back to the shop
          </Link>
        </p>
      </div>
    </main>
  );
}
