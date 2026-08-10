"use client";

import { ProductImage } from "@/components/ui/product-image";
import type { Product } from "@/lib/types";
import { formatPrice } from "@/lib/types";
import { Icon } from "@/components/ui/icon";
import { useCart } from "@/lib/cart/cart-store";
import { useSaveToggle } from "@/lib/wishlist/use-save-toggle";

export function ProductCard({
  product,
  onOpen,
}: {
  product: Product;
  onOpen: (product: Product) => void;
}) {
  const { wishlist, saveToggle } = useSaveToggle();
  const { add } = useCart();
  return (
    <div
      className="group cursor-pointer"
      onClick={() => onOpen(product)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen(product);
        }
      }}
    >
      <div className="aspect-square rounded-[2rem] bg-surface-container-high mb-3 overflow-hidden relative shadow-sm border-2 border-candy-pink/10">
        <ProductImage
          src={product.images[0]}
          alt={product.name}
          sizes="(min-width: 768px) 33vw, 50vw"
          className="object-cover transition-transform duration-700 group-hover:scale-110"
        />
        <button
          onClick={(e) => {
            // Stop the click reaching the card, which opens the modal.
            e.stopPropagation();
            add(product.id);
          }}
          className="absolute bottom-3 right-3 w-10 h-10 bg-white rounded-full flex items-center justify-center text-primary shadow-[4px_4px_0px_#864d61] hover:translate-y-[-2px] transition-all"
          aria-label={`Add ${product.name} to cart`}
        >
          <Icon name="add_shopping_cart" className="text-[20px]" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            void saveToggle(product.id);
          }}
          className="absolute top-3 right-3 w-10 h-10 bg-white rounded-full flex items-center justify-center text-candy-pink shadow-sm hover:scale-110 active:scale-95 transition-all z-10"
          aria-label={`${wishlist.has(product.id) ? "Remove" : "Save"} ${product.name}`}
            aria-pressed={wishlist.has(product.id)}
        >
          <Icon name="favorite" className="text-[20px]" filled={wishlist.has(product.id)} />
        </button>
      </div>
      <div className="text-center">
        <h4 className="font-headline-md text-[14px] text-on-surface mb-1">
          {product.name}
        </h4>
        <p className="text-primary font-bold text-sm">
          {formatPrice(product.priceCents, product.currency)}
        </p>
      </div>
    </div>
  );
}
