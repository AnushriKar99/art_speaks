import Image from "next/image";
import { BadgeSticker } from "@/components/ui/badge-sticker";

/**
 * Real messages and story reposts from customers, shown as the screenshots
 * they arrived as.
 *
 * This replaced three invented testimonials with a stock avatar. A screenshot
 * is worth more than well-written praise precisely because it is obviously not
 * copywriting — the typos and the emoji are the proof.
 *
 * Each card is a fixed height with its width left to follow the image's own
 * proportions. A fixed box would either crop the message out or letterbox the
 * narrow ones; this does neither, at the cost of a ragged right edge as you
 * scroll — which reads as a stack of real screenshots rather than a grid.
 *
 * Intrinsic dimensions are listed so Next can reserve the right space before
 * the image loads, rather than the row reflowing as each one arrives.
 */
const REVIEWS = [
  { src: "/images/reviews/review-7.jpg", w: 1084, h: 1199, alt: "Story: a commissioned piece, thank you so much" },
  { src: "/images/reviews/review-8.jpg", w: 1049, h: 1339, alt: "Story: spotted this lovely small business in HSR Layout" },
  { src: "/images/reviews/review-1.jpg", w: 994, h: 852, alt: "Message: they turned out way cuter than I imagined, thank you for exceeding my expectations" },
  { src: "/images/reviews/review-2.jpg", w: 1059, h: 1363, alt: "Message: received my package today, it's perfect" },
  { src: "/images/reviews/review-3.jpg", w: 1084, h: 1084, alt: "Review: they looked exact as shown and are looking great on my fridge" },
  { src: "/images/reviews/review-5.jpg", w: 1050, h: 1225, alt: "Story: happy with the purchase, all the items are very nice including the freebie" },
  { src: "/images/reviews/review-6.jpg", w: 1076, h: 1600, alt: "Story: got the prettiest bookmarks and look at the freebies" },
];

export function ReviewsCarousel() {
  return (
    <section className="px-margin-mobile md:px-margin-desktop mb-16 relative">
      <div className="text-center mb-10">
        <BadgeSticker className="inline-flex mb-4">Reviews</BadgeSticker>
        <h3 className="text-headline-md font-headline-md text-on-surface">
          Loved by you
        </h3>
        <p className="text-body-md text-on-surface-variant mt-2">
          Straight from the people who ordered.
        </p>
      </div>

      <div className="flex gap-6 overflow-x-auto hide-scrollbar py-4 snap-x snap-mandatory items-start">
        {REVIEWS.map((r) => (
          <figure key={r.src} className="snap-start shrink-0">
            <Image
              src={r.src}
              alt={r.alt}
              width={r.w}
              height={r.h}
              sizes="(min-width: 640px) 400px, 320px"
              className="h-[320px] sm:h-[400px] w-auto max-w-none rounded-[2rem] shadow-lg"
            />
          </figure>
        ))}
      </div>
    </section>
  );
}
