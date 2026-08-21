import Image from "next/image";
import Link from "next/link";

const LOGO_SRC = "/brand/logo.jpg";

/**
 * The logo and wordmark, linking home.
 *
 * Shared by both headers. The homepage's header had the logo and every other
 * page's did not — the two were separate copies of nearly the same markup, so
 * adding the image to one left the other behind. Same drift that hit the
 * wishlist heart, prevented the same way.
 *
 * `asHeading` renders the wordmark as an h1, which is right on the homepage
 * where the shop's name IS the page's heading. Everywhere else the page has
 * its own h1 and this must not compete with it — two h1s leave a screen reader
 * user with no way to tell which one describes the page they are on.
 */
export function BrandMark({ asHeading = false }: { asHeading?: boolean }) {
  const Wordmark = asHeading ? "h1" : "span";

  return (
    <Link href="/" className="flex items-center gap-2 shrink-0">
      <Image
        src={LOGO_SRC}
        // Empty alt, deliberately: the wordmark beside it already says
        // "Art Speaks", and a screen reader announcing the name twice in a row
        // is noise. The link's accessible name comes from the text.
        alt=""
        className="w-9 h-9 rounded-full object-cover border-2 border-candy-pink"
        width={36}
        height={36}
        // Above the fold on every page, so never lazy-loaded.
        priority
      />
      <Wordmark className="font-display-lg text-headline-md italic text-primary tracking-tight">
        Art Speaks
      </Wordmark>
    </Link>
  );
}
