import Link from "next/link";
import { Icon } from "@/components/ui/icon";

/**
 * What to show when a collection has nothing in it.
 *
 * One message for every case would be wrong: a category with no stock, a
 * search that matched nothing, and an empty wishlist are three different
 * situations, and only one of them is the shop's fault. "Check back soon"
 * makes no sense when the visitor is the one who has to act.
 */
export function EmptyCollection({
  collection,
  query,
  signedIn,
}: {
  collection?: string;
  query?: string;
  signedIn: boolean;
}) {
  let icon = "sentiment_dissatisfied";
  let message = "No pieces in this category yet — check back soon!";
  let action: { href: string; label: string } | null = null;

  if (query) {
    icon = "search_off";
    message = `Nothing matched “${query}” — try a different word?`;
    action = { href: "/shop", label: "Browse everything" };
  } else if (collection === "wishlist") {
    icon = "favorite";
    if (signedIn) {
      message = "You haven't saved anything yet — tap the heart on a piece you like!";
      action = { href: "/shop", label: "Browse the shop" };
    } else {
      message = "Sign in to see the pieces you've saved.";
      action = { href: "/login?next=/shop%3Fcollection%3Dwishlist", label: "Sign in" };
    }
  } else if (collection === "best-sellers" || collection === "new-arrivals") {
    message = "Nothing here just yet — check back soon!";
    action = { href: "/shop", label: "Browse everything" };
  }

  return (
    <div className="text-center py-20">
      <Icon name={icon} className="text-6xl text-primary/40" />
      <p className="mt-4 text-body-lg text-on-surface-variant font-medium">
        {message}
      </p>
      {action && (
        <Link
          href={action.href}
          className="inline-flex items-center gap-2 mt-8 bg-candy-pink text-on-primary-container font-headline-md text-body-md py-3 px-8 rounded-full candy-shadow hover:scale-[1.02] active:scale-95 transition-all duration-300"
        >
          {action.label}
          <Icon name="arrow_forward" />
        </Link>
      )}
    </div>
  );
}
