import Link from "next/link";
import { notFound } from "next/navigation";
import { getCategories } from "@/lib/data/products";
import { getAdminProductBySlug } from "@/lib/data/admin";
import { ProductForm } from "@/components/admin/product-form";
import { updateProduct } from "../actions";
import { Icon } from "@/components/ui/icon";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getAdminProductBySlug(slug);
  return { title: `Art Speaks | ${product?.name ?? "Edit piece"}` };
}

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [product, categories] = await Promise.all([
    getAdminProductBySlug(slug),
    getCategories(),
  ]);

  if (!product) notFound();

  return (
    <>
      <Link
        href="/admin/inventory"
        className="inline-flex items-center gap-1 text-primary font-label-caps text-label-caps uppercase tracking-wider hover:underline mb-4"
      >
        <Icon name="chevron_left" className="text-[18px]" />
        Inventory
      </Link>
      <h1 className="font-headline-md text-headline-lg text-primary mb-1">
        {product.name}
      </h1>
      <p className="text-body-md text-on-surface-variant mb-6">
        Last edited {new Date(product.updatedAt).toLocaleDateString("en-IN")}
        {product.isActive ? "" : " · hidden from the shop"}
      </p>
      <ProductForm
        action={updateProduct}
        categories={categories}
        product={product}
      />
    </>
  );
}
