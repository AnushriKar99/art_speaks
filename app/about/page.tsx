import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ShopHeader } from "@/components/layout/shop-header";
import { BottomTabBar } from "@/components/layout/bottom-tab-bar";
import { BadgeSticker } from "@/components/ui/badge-sticker";
import { Icon } from "@/components/ui/icon";
import { getCategories } from "@/lib/data/products";

export const metadata: Metadata = {
  title: "Art Speaks | About Us",
  description:
    "The story behind Art Speaks — a handcrafted art studio where every small piece carries a bit of heart.",
};

// A few "why we're different" values. Placeholder copy — refine anytime.
const VALUES = [
  {
    icon: "back_hand",
    title: "Made by hand",
    body: "Every piece is mixed, shaped, and finished by hand — no two are ever exactly alike.",
  },
  {
    icon: "favorite",
    title: "Made with intention",
    body: "Small, quiet objects designed to turn an ordinary moment into a little ritual.",
  },
  {
    icon: "eco",
    title: "Made in small batches",
    body: "No mass production, no algorithms deciding what you see — just pure craft.",
  },
];

export default async function AboutPage() {
  const categories = await getCategories();

  return (
    <>
      <ShopHeader categories={categories} />
      <main className="min-h-screen dotted-bg pb-32 relative overflow-hidden">
        {/* Floating doodles */}
        <div
          className="absolute top-32 right-8 text-lavender-dream opacity-40 floating-doodle pointer-events-none"
          style={{ animationDelay: "0s" }}
        >
          <Icon name="auto_awesome" className="text-4xl" />
        </div>
        <div
          className="absolute top-[40rem] left-6 text-mint-green opacity-40 floating-doodle pointer-events-none -rotate-2"
          style={{ animationDelay: "1.5s" }}
        >
          <Icon name="star" className="text-3xl" />
        </div>

        {/* ---- Intro ---- */}
        <section className="max-w-5xl mx-auto px-margin-mobile pt-12 relative z-10 grid md:grid-cols-2 gap-12 items-center">
          <div className="order-2 md:order-1">
            <BadgeSticker className="mb-5">Hello!</BadgeSticker>
            <h2 className="font-display-lg text-display-lg-mobile md:text-display-lg text-primary italic mb-5 leading-tight">
              Our Story
            </h2>
            <p className="text-body-lg text-on-surface-variant font-medium leading-relaxed">
              Art Speaks is a tiny handcrafted studio making small objects with
              big feelings — phone charms, worry stones, bookmarks, and custom
              pieces, each one made to carry a little story of its own.
            </p>
          </div>
          <div className="order-1 md:order-2 flex justify-center">
            <div className="relative w-full max-w-sm">
              <div className="aspect-[3/4] rounded-[5rem] overflow-hidden shadow-2xl border-[8px] border-white ring-4 ring-candy-pink/10 relative rotate-[2deg] kawaii-float">
                <Image
                  src="/images/journey.png"
                  alt="The artist at work in the studio"
                  fill
                  sizes="(min-width: 768px) 24rem, 100vw"
                  className="object-cover"
                  priority
                />
              </div>
              <div className="absolute -bottom-8 -right-4 w-32 h-32 bg-candy-pink rounded-full flex items-center justify-center p-6 text-center text-on-primary-container text-[11px] font-black uppercase rotate-12 shadow-xl border-4 border-white">
                Handmade with soul
              </div>
            </div>
          </div>
        </section>

        {/* ---- The journey ---- */}
        <section className="max-w-3xl mx-auto px-margin-mobile pt-24 relative z-10">
          <span className="text-label-caps font-label-caps text-primary uppercase tracking-[0.1em] mb-1 block">
            The Artist
          </span>
          <h3 className="text-headline-lg font-headline-md text-on-surface mb-6">
            How it started
          </h3>
          {/* Placeholder story copy — expand or rewrite anytime. */}
          <p className="text-body-md text-on-surface-variant mb-4 leading-relaxed font-medium">
            It started with a single brushstroke and a need to speak without
            words. Art Speaks began as a personal journal in 2021, and has since
            grown into a community of people who appreciate the tactile and the
            thoughtful.
          </p>
          <p className="text-body-md text-on-surface-variant mb-4 leading-relaxed">
            My workspace is a chaotic collection of dried flowers, vintage beads,
            and too many sketchbooks to count. I wouldn&apos;t have it any other
            way. Every piece that leaves the studio has been held, adjusted, and
            fussed over until it feels just right.
          </p>
          <p className="text-body-md text-on-surface-variant leading-relaxed">
            What began as a way to process my own days has become a way to share
            small moments of whimsy with yours.
          </p>
        </section>

        {/* ---- Values ---- */}
        <section className="max-w-5xl mx-auto px-margin-mobile pt-24 relative z-10">
          <div className="text-center mb-10">
            <BadgeSticker className="mb-4">What we believe</BadgeSticker>
            <h3 className="text-headline-lg font-headline-md text-on-surface">
              Made a little differently
            </h3>
          </div>
          <div className="grid sm:grid-cols-3 gap-6">
            {VALUES.map((value) => (
              <div
                key={value.title}
                className="bg-surface-container-lowest rounded-[2rem] p-8 text-center border-2 border-candy-pink/20 shadow-sm"
              >
                <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-candy-pink/15 flex items-center justify-center text-primary">
                  <Icon name={value.icon} className="text-3xl" />
                </div>
                <h4 className="font-headline-md text-body-lg text-primary mb-2">
                  {value.title}
                </h4>
                <p className="text-body-md text-on-surface-variant leading-relaxed">
                  {value.body}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ---- Call to action ---- */}
        <section className="max-w-3xl mx-auto px-margin-mobile pt-24 relative z-10">
          <div className="bg-cream-bg rounded-[2.5rem] p-10 text-center border-4 border-candy-pink/20 shadow-xl relative overflow-hidden">
            <div className="absolute -top-10 -right-10 w-40 h-40 checkered-pattern opacity-30 rotate-12" />
            <h3 className="text-headline-lg font-headline-md text-primary mb-3 relative">
              Come say hello
            </h3>
            <p className="text-body-md text-on-surface-variant mb-8 max-w-md mx-auto relative">
              Browse the little things I&apos;ve made, or dream up something
              entirely your own.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center relative">
              <Link
                href="/shop"
                className="inline-flex items-center justify-center gap-2 bg-primary text-white py-4 px-8 rounded-full font-label-caps text-label-caps tactile-button shadow-lg"
              >
                <Icon name="storefront" />
                Shop the collection
              </Link>
              <Link
                href="/#custom-orders"
                className="inline-flex items-center justify-center gap-2 bg-white text-primary border-2 border-candy-pink/40 py-4 px-8 rounded-full font-label-caps text-label-caps hover:bg-candy-pink/10 transition-colors"
              >
                <Icon name="edit_note" />
                Request a custom piece
              </Link>
            </div>
          </div>
        </section>
      </main>
      <BottomTabBar />
    </>
  );
}
