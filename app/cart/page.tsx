import type { Metadata } from "next";
import { ShopHeader } from "@/components/layout/shop-header";
import { BottomTabBar } from "@/components/layout/bottom-tab-bar";
import { CartView } from "@/components/cart/cart-view";
import { Icon } from "@/components/ui/icon";
import { getCartItems } from "@/lib/data/cart";

export const metadata: Metadata = {
  title: "art_speaks | Your Basket",
  description: "Review the handmade pieces in your basket before checkout.",
};

export default async function CartPage() {
  const items = await getCartItems();

  return (
    <>
      <ShopHeader />
      <main className="min-h-screen dotted-bg pb-32 relative">
        {/* Floating doodles */}
        <div
          className="absolute top-32 right-10 text-lavender-dream opacity-40 floating-doodle pointer-events-none"
          style={{ animationDelay: "0s" }}
        >
          <Icon name="auto_awesome" className="text-4xl" />
        </div>
        <div
          className="absolute top-80 left-5 text-mint-green opacity-40 floating-doodle pointer-events-none -rotate-2"
          style={{ animationDelay: "2s" }}
        >
          <Icon name="star" className="text-3xl" />
        </div>
        <div
          className="absolute bottom-40 right-20 text-lemon-yellow opacity-40 floating-doodle pointer-events-none"
          style={{ animationDelay: "1s" }}
        >
          <Icon name="draw" className="text-5xl" />
        </div>

        <section className="max-w-2xl mx-auto px-margin-mobile pt-12 relative z-10">
          <h2 className="font-display-lg text-display-lg-mobile md:text-display-lg text-primary italic mb-6">
            Your Basket
          </h2>
          <CartView initialItems={items} />
        </section>
      </main>
      <BottomTabBar />
    </>
  );
}
