import Link from "next/link";
import { Icon } from "@/components/ui/icon";

export const metadata = { title: "Art Speaks | Page not found" };

/**
 * Reached by notFound() — an unknown product slug, an unknown collection — and
 * by any URL that matches no route. Without this the visitor gets Next's
 * unbranded default, which looks like the site is broken rather than that they
 * followed a stale link.
 */
export default function NotFound() {
  return (
    <main className="min-h-screen dotted-bg flex items-center justify-center px-margin-mobile">
      <div className="text-center max-w-md">
        <p className="text-6xl mb-4">🥺</p>
        <h1 className="font-headline-md text-headline-lg text-primary mb-2">
          We can&apos;t find that one
        </h1>
        <p className="text-body-md text-on-surface-variant mb-8">
          It may have sold out and been taken down, or the link may have a typo
          in it.
        </p>
        <Link
          href="/shop"
          className="inline-flex items-center gap-2 bg-candy-pink text-on-primary-container font-headline-md text-body-md py-3 px-8 rounded-full candy-shadow hover:scale-[1.02] active:scale-95 transition-all"
        >
          Browse the shop
          <Icon name="arrow_forward" />
        </Link>
      </div>
    </main>
  );
}
