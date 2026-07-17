import Image from "next/image";
import { BadgeSticker } from "@/components/ui/badge-sticker";
import { StarRating } from "@/components/ui/star-rating";

const REVIEW_IMAGE =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuDtRxS2g0YpcoXPBcMuAenPeQ-A5oWSTDqA7DFPDI9K4fG3tbncgm-3oWAJ9ntgd56wXgoi4rkJvDI80dIQUH_XhDzYJpyasjkud4KYgUUVL1V4jbZolY_-PRbwaTJ0uGVTcdYvKh9hXiqRoaqOEHshNTr8ItutL2_Zf7BsEzJFj0J4Jozrmy2EJlXLGSbgCoU4QBgNbWvHkQNbNhUh1yTZeyl5J2Yd2w3ggoX8C85YvV2MVJoaIVnSzg";

export function ReviewsCarousel() {
  return (
    <section className="px-margin-mobile md:px-margin-desktop mb-16 relative">
      <div className="text-center mb-10">
        <BadgeSticker className="inline-flex mb-4">Reviews</BadgeSticker>
        <h3 className="text-headline-md font-headline-md text-on-surface">
          Loved by you
        </h3>
      </div>
      <div className="flex gap-8 overflow-x-auto hide-scrollbar py-4">
        {/* Review 1 */}
        <div className="min-w-[300px] md:min-w-[340px] bg-white p-8 rounded-[3rem] shadow-lg border-2 border-candy-pink/10 flex flex-col relative">
          <div className="absolute -top-4 -left-2 text-4xl text-candy-pink">
            &ldquo;
          </div>
          <StarRating rating={5} />
          <p className="text-body-md text-on-surface-variant italic my-8 flex-grow leading-relaxed font-medium">
            &ldquo;The phone charm is even more beautiful in person. You can
            really feel the care that went into it.&rdquo;
          </p>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-candy-pink/30 border-2 border-white" />
            <span className="text-label-caps font-bold text-primary tracking-wider">
              Sarah L.
            </span>
          </div>
        </div>

        {/* Review 2 */}
        <div className="min-w-[300px] md:min-w-[340px] bg-white rounded-[3rem] shadow-lg border-2 border-candy-pink/10 overflow-hidden flex flex-col">
          <div className="relative w-full h-44">
            <Image
              src={REVIEW_IMAGE}
              alt="Customer photo"
              fill
              sizes="340px"
              className="object-cover"
            />
          </div>
          <div className="p-8 flex-grow">
            <p className="text-body-md text-on-surface-variant mb-6 font-medium leading-relaxed">
              &ldquo;Perfect addition to my reading nook. Packaging was so
              cute!&rdquo;
            </p>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-lavender-dream/30 border-2 border-white" />
              <span className="text-label-caps font-bold text-primary tracking-wider">
                David K.
              </span>
            </div>
          </div>
        </div>

        {/* Review 3 */}
        <div className="min-w-[300px] md:min-w-[340px] bg-white p-8 rounded-[3rem] shadow-lg border-2 border-candy-pink/10 flex flex-col relative">
          <div className="absolute -top-4 -left-2 text-4xl text-candy-pink">
            &ldquo;
          </div>
          <StarRating rating={5} />
          <p className="text-body-md text-on-surface-variant italic my-8 flex-grow leading-relaxed font-medium">
            &ldquo;My worry stone goes everywhere with me now. Such a calming
            little companion.&rdquo;
          </p>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-mint-green/30 border-2 border-white" />
            <span className="text-label-caps font-bold text-primary tracking-wider">
              Priya M.
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
