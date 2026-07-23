import type { Metadata } from "next";
import { ShopHeader } from "@/components/layout/shop-header";
import { BottomTabBar } from "@/components/layout/bottom-tab-bar";
import { Icon } from "@/components/ui/icon";
import { getCategories } from "@/lib/data/products";

export const metadata: Metadata = {
  title: "Art Speaks | Refund Policy",
  description: "Refund and return policy for the Art Speaks studio.",
};

export default async function RefundPolicyPage() {
  const categories = await getCategories();

  return (
    <>
      <ShopHeader categories={categories} />
      <main className="min-h-screen dotted-bg pb-32 relative">
        {/* Floating doodles */}
        <div
          className="absolute top-32 right-10 text-lavender-dream opacity-40 floating-doodle pointer-events-none"
          style={{ animationDelay: "0s" }}
        >
          <Icon name="auto_awesome" className="text-4xl" />
        </div>
        <div
          className="absolute bottom-40 left-8 text-mint-green opacity-40 floating-doodle pointer-events-none -rotate-2"
          style={{ animationDelay: "1s" }}
        >
          <Icon name="star" className="text-3xl" />
        </div>

        <section className="max-w-2xl mx-auto px-margin-mobile pt-12 relative z-10">
          <h2 className="font-display-lg text-display-lg-mobile md:text-display-lg text-primary italic mb-6">
            Refund Policy
          </h2>
          {/* Content intentionally left empty — real policy copy to be added later. */}
          <p className="text-body-md text-on-surface-variant font-medium">
            Our refund policy is being written with care. Please check back
            soon, or reach out through any of the links in the footer if you
            have a question in the meantime.
          </p>
        </section>
      </main>
      <BottomTabBar />
    </>
  );
}
