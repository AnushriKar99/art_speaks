import Link from "next/link";
import { getCategories } from "@/lib/data/products";
import { ProductForm } from "@/components/admin/product-form";
import { createProduct } from "../actions";
import { Icon } from "@/components/ui/icon";

export const metadata = { title: "Art Speaks | Add a piece" };

export default async function NewProductPage() {
  const categories = await getCategories();

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
        Add a piece
      </h1>
      <p className="text-body-md text-on-surface-variant mb-6">
        It appears in the shop as soon as it is listed and has a category.
      </p>
      <ProductForm action={createProduct} categories={categories} />
    </>
  );
}
