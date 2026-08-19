import type { Metadata } from "next";
import { ShopHeader } from "@/components/layout/shop-header";
import { AccountMenu } from "@/components/layout/account-menu";
import { BottomTabBar } from "@/components/layout/bottom-tab-bar";
import { ProductGrid } from "@/components/product/product-grid";
import { Icon } from "@/components/ui/icon";
import { getCategories, getCollection } from "@/lib/data/products";
import { EmptyCollection } from "@/components/product/empty-collection";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";

type ShopSearchParams = Promise<{ collection?: string; q?: string }>;

export async function generateMetadata({
  searchParams,
}: {
  searchParams: ShopSearchParams;
}): Promise<Metadata> {
  const { collection, q } = await searchParams;
  const view = await getCollection(collection, q);
  if (!view) return { title: "Art Speaks | Not found" };
  const { title } = view;
  return {
    title: `Art Speaks | ${title}`,
    description: `Browse ${title} from the Art Speaks studio.`,
  };
}

export default async function ShopPage({
  searchParams,
}: {
  searchParams: ShopSearchParams;
}) {
  const { collection: collectionSlug, q } = await searchParams;

  const supabase = await createClient();
  const [categories, view, auth] = await Promise.all([
    getCategories(),
    getCollection(collectionSlug, q),
    supabase.auth.getClaims(),
  ]);
  const signedIn = Boolean(auth.data?.claims?.sub);

  // An unknown collection slug is a 404, not a 200 serving the full catalogue.
  if (!view) notFound();
  const { title: heading, eyebrow, products } = view;

  return (
    <>
      <ShopHeader categories={categories} account={<AccountMenu />} query={q} />
      <main className="min-h-screen checkered-bg pb-32 relative">
        {/* Floating doodles */}
        <div
          className="absolute top-24 left-6 text-candy-pink opacity-50 floating-doodle pointer-events-none"
          style={{ animationDelay: "0s" }}
        >
          <Icon name="star" className="text-4xl" />
        </div>
        <div
          className="absolute top-48 right-8 text-mint-green opacity-50 floating-doodle pointer-events-none"
          style={{ animationDelay: "2s" }}
        >
          <Icon name="cyclone" className="text-5xl" />
        </div>
        <div
          className="absolute bottom-1/4 left-1/4 text-lavender-dream opacity-40 floating-doodle pointer-events-none"
          style={{ animationDelay: "1s" }}
        >
          <Icon name="favorite" className="text-6xl" />
        </div>

        <section className="max-w-container-max mx-auto px-margin-mobile pt-12 relative z-10">
          <div className="mb-8">
            <span className="text-label-lg font-label-caps text-primary uppercase tracking-[0.1em]">
              {eyebrow}
            </span>
            <h2 className="text-headline-lg font-headline-md text-on-surface mt-1">
              {heading}
            </h2>
          </div>

          {products.length > 0 ? (
            <ProductGrid products={products} />
          ) : (
            <EmptyCollection
              collection={collectionSlug}
              query={q}
              signedIn={signedIn}
            />
          )}
        </section>
      </main>
      <BottomTabBar />
    </>
  );
}
