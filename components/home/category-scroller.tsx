import Image from "next/image";
import Link from "next/link";
import type { Category } from "@/lib/types";

export function CategoryScroller({ categories }: { categories: Category[] }) {
  return (
    <section className="mb-16 relative">
      <div className="px-margin-mobile md:px-margin-desktop flex justify-between items-end mb-8">
        <h3 className="text-headline-lg font-headline-md text-on-surface">
          Shop by Category
        </h3>
        <Link
          href="/shop"
          className="text-primary font-label-caps text-label-lg uppercase tracking-wider border-b-2 border-candy-pink pb-1 hover:text-candy-pink transition-colors"
        >
          View all
        </Link>
      </div>
      <div className="flex gap-6 overflow-x-auto px-margin-mobile md:px-margin-desktop hide-scrollbar pb-4">
        {categories.map((category) => (
          <Link
            key={category.id}
            href={`/shop?collection=${category.slug}`}
            className="w-[140px] shrink-0 text-center group cursor-pointer"
          >
            <div
              className="aspect-square rounded-[3rem] overflow-hidden border-4 mb-4 group-hover:translate-y-[-4px] transition-transform relative"
              style={{
                borderColor: category.accentColor,
                boxShadow: `6px 6px 0px ${category.shadowColor}`,
              }}
            >
              <Image
                src={category.image}
                alt={category.name}
                fill
                sizes="140px"
                className="object-cover"
              />
            </div>
            <span className="text-label-caps font-label-caps text-primary group-hover:font-bold block leading-tight">
              {category.name}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
