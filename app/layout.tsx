import type { Metadata } from "next";
import { Fredoka, Be_Vietnam_Pro, Hanken_Grotesk } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/lib/cart/cart-store";
import { WishlistProvider } from "@/lib/wishlist/wishlist-store";
import { ToastProvider } from "@/components/ui/toast";

const fredoka = Fredoka({
  variable: "--font-fredoka",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const beVietnam = Be_Vietnam_Pro({
  variable: "--font-be-vietnam",
  subsets: ["latin"],
  weight: ["400", "600"],
  display: "swap",
});

const hanken = Hanken_Grotesk({
  variable: "--font-hanken",
  subsets: ["latin"],
  weight: ["700", "800"],
  display: "swap",
});

/**
 * Read from the environment so a deploy sets it once, rather than a hardcoded
 * domain drifting out of date. Falls back to localhost for development, where
 * an absolute URL is only needed so relative OG images resolve.
 */
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  // Without metadataBase, relative OG image paths are dropped rather than
  // resolved, and the card renders with no picture.
  metadataBase: new URL(SITE_URL),
  title: "Art Speaks | Handcrafted Artistic Curations",
  description:
    "A handcrafted art studio. Small items, big feelings — phone charms, worry stones, bookmarks and custom pieces made with love.",
  // The studio sells through WhatsApp and Instagram, so a pasted link IS the
  // shopfront window. Without these it renders as a bare blue link.
  openGraph: {
    type: "website",
    siteName: "Art Speaks",
    title: "Art Speaks | Handcrafted Artistic Curations",
    description:
      "Small items, big feelings — phone charms, worry stones, bookmarks and custom pieces, handmade in a tiny studio.",
    // 1200x630 is the shape every platform crops toward — WhatsApp,
    // Instagram, Twitter, iMessage. This is the logo centred on the site's own
    // background rather than a photo, so nothing important is lost whichever
    // way a given app trims it.
    //
    // Was /images/journey.png: a 896x1195 PORTRAIT photo, so previews cropped
    // a tall image into a wide slot and showed a band from the middle of it.
    images: [{ url: "/brand/og-image.jpg", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Art Speaks | Handcrafted Artistic Curations",
    description:
      "Small items, big feelings — handmade phone charms, worry stones and bookmarks.",
    images: ["/brand/og-image.jpg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${fredoka.variable} ${beVietnam.variable} ${hanken.variable}`}
    >
      <head>
        {/* Material Symbols is a variable icon font; next/font doesn't handle its
            axes well, so load it directly. */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
        />
      </head>
      <body className="bg-background text-on-background font-body-md relative overflow-x-hidden">
        <ToastProvider>
          <WishlistProvider>
            <CartProvider>{children}</CartProvider>
          </WishlistProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
