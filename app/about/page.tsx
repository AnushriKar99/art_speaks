import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ShopHeader } from "@/components/layout/shop-header";
import { AccountMenu } from "@/components/layout/account-menu";
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
      <ShopHeader categories={categories} account={<AccountMenu />} />
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
            <p className="text-body-lg text-on-surface-variant font-medium leading-relaxed mb-4">
              Art Speaks is a tiny studio (basically a bedroom) where we create a
              little bit of everything — from phone charms and worry stones to
              embroidery and paintings.
            </p>
            <p className="text-body-lg text-on-surface-variant font-medium leading-relaxed mb-4">
              Everything is handcrafted here, with lots of love (and probably a
              little chaos), from the products themselves to the packaging they
              arrive in.
            </p>
            <p className="text-body-lg text-on-surface-variant font-medium leading-relaxed">
              It&apos;s small, it&apos;s personal, and it&apos;s very much us.
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
          <h3 className="text-headline-lg font-headline-md text-on-surface mb-6">
            An Art Kid&apos;s Journey of Survival
          </h3>
          <p className="text-body-md text-on-surface-variant mb-4 leading-relaxed font-medium">
            It started in lockdown, when not only was the world locked inside,
            but so was my life.
          </p>
          <p className="text-body-md text-on-surface-variant mb-4 leading-relaxed">
            When life got too much to bear and everything felt stuck, it was art
            that kept me going. Slowly, I found my groove again — not just in
            art, but in myself.
          </p>
          <p className="text-body-md text-on-surface-variant mb-4 leading-relaxed">
            What started with simply getting back to creating grew into building
            a community that appreciated my art, and eventually, into starting my
            own small business.
          </p>
          <p className="text-body-md text-on-surface-variant mb-4 leading-relaxed">
            It&apos;s been a rollercoaster ride — messy, chaotic, beautiful, and
            everything in between. But through it all, there&apos;s been me and
            this little art kid inside me, figuring it all out together.
          </p>
          <p className="text-body-md text-on-surface-variant leading-relaxed">
            And honestly, we wouldn&apos;t have it any other way.
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
