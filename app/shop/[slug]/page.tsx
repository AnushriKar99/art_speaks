import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ShopHeader } from "@/components/layout/shop-header";
import { AccountMenu } from "@/components/layout/account-menu";
import { BottomTabBar } from "@/components/layout/bottom-tab-bar";
import { ProductGrid } from "@/components/product/product-grid";
import { ProductImage } from "@/components/ui/product-image";
import { AddToCartButton } from "@/components/cart/add-to-cart-button";
import { Icon } from "@/components/ui/icon";
import {
  getCategories,
  getProductBySlug,
  getRelatedProducts,
} from "@/lib/data/products";
import { formatPrice } from "@/lib/types";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: "Art Speaks | Not found" };

  // A pasted link is the shopfront window for a studio selling over WhatsApp
  // and Instagram, so a product needs its own card rather than the site-wide one.
  return {
    title: `Art Speaks | ${product.name}`,
    description:
      product.description ||
      `${product.name} — handmade by Art Speaks, ${formatPrice(product.priceCents, product.currency)}.`,
    openGraph: {
      title: product.name,
      description: product.description || "Handmade by Art Speaks.",
      images: product.images.length ? [product.images[0]] : undefined,
      type: "website",
    },
  };
}

export default async function ProductPage({ params }: { params: Params }) {
  const { slug } = await params;
  const [product, categories] = await Promise.all([
    getProductBySlug(slug),
    getCategories(),
  ]);

  // A slug that does not exist, and one that is delisted, are both a 404 —
  // not a 200 with an empty shell.
  if (!product) notFound();

  const related = await getRelatedProducts(product.categorySlug, product.slug);
  const category = categories.find((c) => c.slug === product.categorySlug);
  const soldOut = product.stockCount === 0;

  return (
    <>
      <ShopHeader categories={categories} account={<AccountMenu />} />
      <main className="min-h-screen dotted-bg pb-32">
        <div className="max-w-container-max mx-auto px-margin-mobile lg:px-margin-desktop py-6">
          <nav className="mb-6 text-body-md text-on-surface-variant">
            <Link href="/shop" className="hover:text-primary hover:underline">
              Shop
            </Link>
            {category && (
              <>
                <span className="mx-2">/</span>
                <Link
                  href={`/shop?collection=${category.slug}`}
                  className="hover:text-primary hover:underline"
                >
                  {category.name}
                </Link>
              </>
            )}
          </nav>

          <div className="grid md:grid-cols-2 gap-10 items-start">
            <div className="relative aspect-square rounded-[2.5rem] overflow-hidden border-4 border-white shadow-xl bg-surface-container-high">
              <ProductImage
                src={product.images[0]}
                alt={product.name}
                sizes="(min-width: 768px) 40rem, 100vw"
                className="object-cover"
              />
            </div>

            <div>
              <h1 className="font-headline-md text-headline-lg text-primary mb-2">
                {product.name}
              </h1>
              <p className="font-headline-md text-headline-md text-on-surface mb-1">
                {formatPrice(product.priceCents, product.currency)}
              </p>
              <p
                className={`text-body-md mb-6 ${soldOut ? "text-error" : "text-on-surface-variant"}`}
              >
                {soldOut
                  ? "Sold out — message us if you'd like one made"
                  : `${product.stockCount} left`}
              </p>

              {product.description && (
                <p className="text-body-md text-on-surface-variant leading-relaxed mb-4">
                  {product.description}
                </p>
              )}
              {product.artisanNote && (
                <p className="text-body-md text-on-surface-variant italic leading-relaxed mb-6 border-l-4 border-candy-pink/40 pl-4">
                  {product.artisanNote}
                </p>
              )}

              <div className="flex items-center gap-4">
                <AddToCartButton
                  productId={product.id}
                  productName={product.name}
                  stockCount={product.stockCount}
                />
                <Link
                  href="/cart"
                  className="text-primary font-label-caps text-label-caps uppercase tracking-wider hover:underline"
                >
                  View basket
                </Link>
              </div>
            </div>
          </div>

          {related.length > 0 && (
            <section className="mt-16">
              <h2 className="font-headline-md text-headline-md text-primary mb-4">
                More from {category?.name ?? "the shop"}
              </h2>
              <ProductGrid products={related} />
            </section>
          )}

          <p className="mt-12">
            <Link
              href="/shop"
              className="inline-flex items-center gap-1 text-primary font-label-caps text-label-caps uppercase tracking-wider hover:underline"
            >
              <Icon name="chevron_left" className="text-[18px]" />
              All items
            </Link>
          </p>
        </div>
      </main>
      <BottomTabBar />
    </>
  );
}
