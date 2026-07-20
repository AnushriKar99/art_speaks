import type { Metadata } from "next";
import { Fredoka, Be_Vietnam_Pro, Hanken_Grotesk } from "next/font/google";
import "./globals.css";

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

export const metadata: Metadata = {
  title: "Art Speaks | Handcrafted Artistic Curations",
  description:
    "A handcrafted art studio. Small items, big feelings — phone charms, worry stones, bookmarks and custom pieces made with love.",
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
        {children}
      </body>
    </html>
  );
}
