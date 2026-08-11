"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";

/**
 * Contains a render throw to a friendly message with a retry, instead of
 * losing the visitor to an unbranded stack trace.
 *
 * It does not fix the underlying error — it stops one bad component taking the
 * whole page with it. A storage-blocked browser throwing inside the cart
 * provider, for instance, would otherwise blank the homepage.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("page error:", error);
  }, [error]);

  return (
    <main className="min-h-screen dotted-bg flex items-center justify-center px-margin-mobile">
      <div className="text-center max-w-md">
        <p className="text-6xl mb-4">🫠</p>
        <h1 className="font-headline-md text-headline-lg text-primary mb-2">
          Something went wrong
        </h1>
        <p className="text-body-md text-on-surface-variant mb-8">
          That&apos;s on us, not you. Try again — and if it keeps happening,
          message the studio and we&apos;ll sort it.
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          <button
            onClick={reset}
            className="tactile-button rounded-2xl bg-primary text-on-primary font-headline-md px-6 py-3 text-body-md"
          >
            Try again
          </button>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-2xl border-2 border-outline-variant px-6 py-3 text-body-md text-primary hover:bg-surface-container-high transition-colors"
          >
            <Icon name="home" className="text-[18px]" />
            Home
          </Link>
        </div>
      </div>
    </main>
  );
}
