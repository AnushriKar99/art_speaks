import type { Metadata } from "next";
import { ShopHeader } from "@/components/layout/shop-header";
import { AccountMenu } from "@/components/layout/account-menu";
import { BottomTabBar } from "@/components/layout/bottom-tab-bar";
import { Icon } from "@/components/ui/icon";
import { getCategories } from "@/lib/data/products";
import { EMAIL_ADDRESS, buildWhatsAppLink } from "@/lib/contact";
import { SiteFooter } from "@/components/layout/site-footer";

export const metadata: Metadata = {
  title: "Art Speaks | Refund Policy",
  description: "Refund and return policy for the Art Speaks studio.",
};

export default async function RefundPolicyPage() {
  const categories = await getCategories();

  return (
    <>
      <ShopHeader categories={categories} account={<AccountMenu />} />
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
          <h2 className="font-display-lg text-display-lg-mobile md:text-display-lg text-primary italic mb-2">
            Refund Policy
          </h2>
          <p className="text-label-caps font-label-caps text-on-surface-variant/60 uppercase tracking-widest mb-8">
            Last updated: July 2026
          </p>

          <div className="space-y-8 text-on-surface-variant">
            <p className="text-body-md leading-relaxed font-medium">
              Every piece at Art Speaks is made by hand, one at a time, and
              often to order. Because of this, we generally do not accept
              returns or refunds — except under the special circumstances
              described below. Thank you for understanding the nature of small,
              handmade work. 💌
            </p>

            <div>
              <h3 className="text-headline-md font-headline-md text-primary mb-3">
                Order changes &amp; cancellations
              </h3>
              <p className="text-body-md leading-relaxed">
                Once an order has been placed, it cannot be cancelled or
                changed. We begin preparing and crafting your pieces right away,
                so please double-check your selection, quantities, and any
                custom details before checking out.
              </p>
            </div>

            <div>
              <h3 className="text-headline-md font-headline-md text-primary mb-3">
                Damaged, defective, or incorrect items
              </h3>
              <p className="text-body-md leading-relaxed mb-3">
                We pack every order with care, but if your item arrives damaged,
                defective, or if you received the wrong piece, please reach out
                within <strong>3 days of delivery</strong> so we can make it
                right. Depending on the situation, we may offer a replacement,
                repair, or refund.
              </p>
              <p className="text-body-md leading-relaxed">
                To process any claim, we require a clear{" "}
                <strong>unboxing video</strong> showing the sealed package being
                opened, along with photos of the item and packaging. Claims
                cannot be processed without this.
              </p>
            </div>

            <div>
              <h3 className="text-headline-md font-headline-md text-primary mb-3">
                What isn&apos;t eligible
              </h3>
              <ul className="space-y-2">
                {[
                  "Custom and personalized pieces, unless they arrive damaged or defective.",
                  "Change-of-mind returns or buyer's remorse.",
                  "Minor variations in color, shape, or texture — these are natural to handmade work and are part of each piece's charm.",
                  "Items reported after the 3-day window, or without an unboxing video.",
                ].map((text) => (
                  <li key={text} className="flex gap-3 text-body-md leading-relaxed">
                    <Icon
                      name="favorite"
                      className="text-candy-pink text-lg mt-0.5 shrink-0"
                    />
                    <span>{text}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="text-headline-md font-headline-md text-primary mb-3">
                Refunds
              </h3>
              <p className="text-body-md leading-relaxed">
                Where a refund is approved, it will be issued to your original
                payment method. Please allow a few business days for it to
                appear, depending on your bank or payment provider.
              </p>
            </div>

            <div>
              <h3 className="text-headline-md font-headline-md text-primary mb-3">
                Get in touch
              </h3>
              <p className="text-body-md leading-relaxed mb-4">
                Have a question or a concern about your order? We&apos;re always
                happy to help — every situation is looked at individually.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <a
                  href={`mailto:${EMAIL_ADDRESS}`}
                  className="inline-flex items-center justify-center gap-2 bg-white text-primary border-2 border-candy-pink/40 py-3 px-6 rounded-full font-label-caps text-label-caps hover:bg-candy-pink/10 transition-colors"
                >
                  <Icon name="mail" />
                  Email us
                </a>
                <a
                  href={buildWhatsAppLink()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 bg-white text-primary border-2 border-mint-green/40 py-3 px-6 rounded-full font-label-caps text-label-caps hover:bg-mint-green/10 transition-colors"
                >
                  <Icon name="chat" />
                  Message on WhatsApp
                </a>
              </div>
            </div>

            <p className="text-body-md leading-relaxed font-medium pt-2">
              We truly appreciate your understanding and support of handmade
              art. 🌷
            </p>
          </div>
        </section>
      </main>
      <SiteFooter />
      <BottomTabBar />
    </>
  );
}
