"use client";

import { useState } from "react";
import type { Product } from "@/lib/types";
import { ProductCard } from "@/components/product/product-card";
import { ProductModal } from "@/components/product/product-modal";

export function ProductGrid({ products }: { products: Product[] }) {
  const [selected, setSelected] = useState<Product | null>(null);

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-gutter">
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            onOpen={setSelected}
          />
        ))}
      </div>
      <ProductModal product={selected} onClose={() => setSelected(null)} />
    </>
  );
}
