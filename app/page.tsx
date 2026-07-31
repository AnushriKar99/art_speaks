import { SiteHeader } from "@/components/layout/site-header";
import { AccountMenu } from "@/components/layout/account-menu";
import { SiteFooter } from "@/components/layout/site-footer";
import { DecorativeBlobs } from "@/components/home/decorative-blobs";
import { Hero } from "@/components/home/hero";
import { ProductCarousel } from "@/components/home/product-carousel";
import { CategoryScroller } from "@/components/home/category-scroller";
import { CustomOrderForm } from "@/components/home/custom-order-form";
import { AboutSection } from "@/components/home/about-section";
import { ReviewsCarousel } from "@/components/home/reviews-carousel";
import {
  getBestSellers,
  getNewArrivals,
  getCategories,
} from "@/lib/data/products";

export default async function Home() {
  const [bestSellers, newArrivals, categories] = await Promise.all([
    getBestSellers(),
    getNewArrivals(),
    getCategories(),
  ]);

  return (
    <>
      <DecorativeBlobs />
      <SiteHeader categories={categories} account={<AccountMenu />} />
      <main className="pt-20 pb-16 relative">
        <Hero />

        {/* Best Sellers */}
        <section className="mb-16 relative">
          <ProductCarousel
            eyebrow="Curated Favorites"
            title="Best Sellers"
            products={bestSellers}
            viewMoreHref="/shop?collection=best-sellers"
            variant="bestseller"
          />
        </section>

        {/* New Arrivals */}
        <section className="mb-16 py-12 relative overflow-hidden">
          <div className="absolute inset-0 checkered-pattern-mint z-[-1]" />
          <div className="relative z-10">
            <ProductCarousel
              badge="New Arrivals"
              title="Fresh out of the oven"
              products={newArrivals}
              viewMoreHref="/shop?collection=new-arrivals"
              variant="arrival"
            />
          </div>
        </section>

        <CategoryScroller categories={categories} />
        <CustomOrderForm />
        <AboutSection />
        <ReviewsCarousel />
      </main>
      <SiteFooter />
    </>
  );
}
