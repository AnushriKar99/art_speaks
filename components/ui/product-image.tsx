import Image from "next/image";

/** Shown when a product has no photo yet. Swap freely — 😔 🥲 😿 all work. */
const NO_IMAGE_EMOJI = "🥺";

/**
 * A product photo, or a friendly stand-in when there isn't one.
 *
 * Products are listed before they're photographed — you make a batch, put it up
 * for sale, and shoot pictures at the weekend. `products.images` is an empty
 * array until then, and `next/image` throws outright on a missing `src`, so
 * every place that shows a product needs this fallback rather than a URL.
 *
 * Always fills its parent, which must be `relative` with a definite size.
 */
export function ProductImage({
  src,
  alt,
  sizes,
  className = "",
}: {
  /** `product.images[0]` — may be undefined. */
  src: string | undefined;
  alt: string;
  sizes: string;
  className?: string;
}) {
  if (src) {
    return (
      <Image src={src} alt={alt} fill sizes={sizes} className={className} />
    );
  }

  return (
    <div
      role="img"
      aria-label={`${alt} — no photo yet`}
      // A container query lets the emoji scale with whatever box it lands in:
      // the same component sits in a 64px cart thumbnail and a 260px carousel
      // card, and a fixed font-size would be wrong in both.
      style={{ containerType: "inline-size" }}
      className="absolute inset-0 flex items-center justify-center bg-surface-container-high select-none"
    >
      <span style={{ fontSize: "38cqi", lineHeight: 1 }} aria-hidden="true">
        {NO_IMAGE_EMOJI}
      </span>
    </div>
  );
}
