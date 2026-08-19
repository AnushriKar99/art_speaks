"use client";

import { ProductImage } from "@/components/ui/product-image";
import type { Product } from "@/lib/types";
import { formatPrice } from "@/lib/types";
import { WishlistHeart } from "@/components/product/wishlist-heart";
import { AddToCartButton } from "@/components/cart/add-to-cart-button";

export function ProductCard({
  product,
  onOpen,
}: {
  product: Product;
  onOpen: (product: Product) => void;
}) {
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
        <AddToCartButton
          productId={product.id}
          productName={product.name}
          stockCount={product.stockCount}
          className="absolute bottom-3 right-3"
        />
        <WishlistHeart
          productId={product.id}
          productName={product.name}
          position="top-3 right-3"
        />
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
