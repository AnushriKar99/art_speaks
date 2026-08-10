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
 * Portrait images of differing heights, so they sit in a horizontal scroller
 * at a fixed height rather than a grid, where the ragged bottoms would show.
 */
const REVIEWS = [
  { src: "/images/reviews/review-1.jpg", alt: "Message: they turned out way cuter than I imagined, thank you for exceeding my expectations" },
  { src: "/images/reviews/review-2.jpg", alt: "Message: received my package today, it's perfect" },
  { src: "/images/reviews/review-3.jpg", alt: "Review: they looked exact as shown and are looking great on my fridge" },
  { src: "/images/reviews/review-4.jpg", alt: "Story: everything is too cute, I will love to purchase more" },
  { src: "/images/reviews/review-5.jpg", alt: "Story: happy with the purchase, all the items are very nice including the freebie" },
  { src: "/images/reviews/review-6.jpg", alt: "Story: got the prettiest bookmarks and look at the freebies" },
  { src: "/images/reviews/review-7.jpg", alt: "Story: a commissioned piece, thank you so much" },
  { src: "/images/reviews/review-8.jpg", alt: "Story: spotted this lovely small business in HSR Layout" },
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

      <div className="flex gap-6 overflow-x-auto hide-scrollbar py-4 snap-x snap-mandatory">
        {REVIEWS.map((r) => (
          <figure
            key={r.src}
            className="snap-start shrink-0 bg-white p-3 rounded-[2rem] shadow-lg border-2 border-candy-pink/10"
          >
            <div className="relative w-[240px] sm:w-[280px] h-[340px] sm:h-[400px] rounded-[1.4rem] overflow-hidden bg-surface-container-high">
              <Image
                src={r.src}
                alt={r.alt}
                fill
                sizes="(min-width: 640px) 280px, 240px"
                // object-top: the message is at the top of most of these, and
                // centring would crop the words rather than the packaging.
                className="object-cover object-top"
              />
            </div>
          </figure>
        ))}
      </div>
    </section>
  );
}
