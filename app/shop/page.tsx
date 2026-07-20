import type { Metadata } from "next";
import { ShopHeader } from "@/components/layout/shop-header";
import { BottomTabBar } from "@/components/layout/bottom-tab-bar";
import { ProductGrid } from "@/components/product/product-grid";
import { CategoryFilter } from "@/components/product/category-filter";
import { Icon } from "@/components/ui/icon";
import { getCategories, getCollection } from "@/lib/data/products";

type ShopSearchParams = Promise<{ collection?: string }>;

export async function generateMetadata({
  searchParams,
}: {
  searchParams: ShopSearchParams;
}): Promise<Metadata> {
  const { collection } = await searchParams;
  const { title } = await getCollection(collection);
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
  const { collection: collectionSlug } = await searchParams;

  const [categories, view] = await Promise.all([
    getCategories(),
    getCollection(collectionSlug),
  ]);

  const { title: heading, eyebrow, products, categorySlug } = view;

  return (
    <>
      <ShopHeader />
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

          <CategoryFilter categories={categories} activeSlug={categorySlug} />
          {/* activeSlug is set only for category collections, so best-sellers /
              new-arrivals / wishlist leave every chip unhighlighted. */}

          {products.length > 0 ? (
            <ProductGrid products={products} />
          ) : (
            <div className="text-center py-20">
              <Icon name="sentiment_dissatisfied" className="text-6xl text-primary/40" />
              <p className="mt-4 text-body-lg text-on-surface-variant font-medium">
                No pieces in this category yet — check back soon!
              </p>
            </div>
          )}
        </section>
      </main>
      <BottomTabBar />
    </>
  );
}
