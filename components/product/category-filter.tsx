import Link from "next/link";
import type { Category } from "@/lib/types";

export function CategoryFilter({
  categories,
  activeSlug,
}: {
  categories: Category[];
  activeSlug?: string;
}) {
  const chip = (active: boolean) =>
    active
      ? "px-5 py-2 rounded-full bg-primary text-white font-label-caps text-label-caps uppercase tracking-wider whitespace-nowrap shadow-sm"
      : "px-5 py-2 rounded-full bg-white border-2 border-candy-pink/30 text-primary font-label-caps text-label-caps uppercase tracking-wider whitespace-nowrap hover:bg-candy-pink/20 transition-colors";

  return (
    <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-2 mb-8">
      <Link href="/shop" className={chip(!activeSlug)}>
        All Items
      </Link>
      {categories.map((category) => (
        <Link
          key={category.id}
          href={`/shop?collection=${category.slug}`}
          className={chip(activeSlug === category.slug)}
        >
          {category.name}
        </Link>
      ))}
    </div>
  );
}
