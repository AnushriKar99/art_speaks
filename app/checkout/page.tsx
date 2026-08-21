import type { Metadata } from "next";
import { ShopHeader } from "@/components/layout/shop-header";
import { AccountMenu } from "@/components/layout/account-menu";
import { CheckoutForm } from "@/components/checkout/checkout-form";
import { getCategories } from "@/lib/data/products";
import { SiteFooter } from "@/components/layout/site-footer";

export const metadata: Metadata = {
  title: "Art Speaks | Place your order",
  description: "Tell us where to send it, and we'll confirm on WhatsApp.",
};

export default async function CheckoutPage() {
  const categories = await getCategories();

  return (
    <>
      <ShopHeader categories={categories} account={<AccountMenu />} />
      <main className="min-h-screen dotted-bg pb-32">
        <div className="max-w-container-max mx-auto px-margin-mobile lg:px-margin-desktop py-10">
          <h1 className="font-headline-md text-headline-lg text-primary mb-1">
            Place your order
          </h1>
          <p className="text-body-md text-on-surface-variant mb-8">
            Nothing is charged here. We&apos;ll confirm on WhatsApp and send
            payment details.
          </p>
          <CheckoutForm />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
