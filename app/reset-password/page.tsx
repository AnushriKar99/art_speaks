import type { Metadata } from "next";
import Link from "next/link";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export const metadata: Metadata = {
  title: "Art Speaks | Set a new password",
  // Recovery links should never be indexed or previewed by a link unfurler.
  robots: { index: false, follow: false },
};

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  // Read here and passed down rather than useSearchParams in the client
  // component — that hook forced the whole tree behind Suspense and broke a
  // production build in this project once already.
  const { error } = await searchParams;
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
          <p className="text-body-md text-on-surface-variant">
            Set a new password
          </p>
        </div>

        <ResetPasswordForm reason={error} />
      </div>
    </main>
  );
}
