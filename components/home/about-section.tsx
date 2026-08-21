import Image from "next/image";
import { BadgeSticker } from "@/components/ui/badge-sticker";

/**
 * The studio's logo artwork. 512x512 — which sets the ceiling on how large it
 * can be shown: at 256px CSS a 2x display asks for exactly 512, so that is the
 * largest size that stays sharp. Anything wider upscales and goes soft.
 */
const ABOUT_IMAGE = "/brand/logo.jpg";
const ABOUT_IMAGE_PX = 256;

export function AboutSection() {
  return (
    // overflow-x-clip: the badge below deliberately overhangs its frame, and
    // on a phone that overhang plus its rotation pushed the whole page 15px
    // wider than the screen — the homepage was the only page that slid
    // sideways. Clip rather than hidden, so this does not become a scroll
    // container and break anything sticky inside it.
    <section className="px-margin-mobile md:px-margin-desktop mb-16 grid md:grid-cols-2 gap-12 items-center relative py-12 overflow-x-clip">
      <div className="absolute inset-0 checkered-pattern-mint opacity-20 z-[-1] rounded-[60px]" />
      {/* Centred on a phone, where the column sits under a centred photo and
          left-aligned text read as misaligned against it. The paragraphs stay
          left-aligned in a centred block — centring five lines of prose makes
          every line start in a different place and is markedly harder to
          read. From md the two-column layout takes over and everything is
          left-aligned as before. */}
      <div className="order-2 md:order-1 relative text-center md:text-left">
        <BadgeSticker className="mb-4">Hello!</BadgeSticker>
        <h3 className="text-headline-md font-headline-md text-on-surface mb-6">
          An Art Kid&apos;s Journey of Survival
        </h3>
        <p className="text-body-md text-on-surface-variant mb-4 leading-relaxed font-medium text-left mx-auto max-w-prose">
          It started in lockdown, when not only was the world locked inside, but
          so was my life.
        </p>
        <p className="text-body-md text-on-surface-variant mb-4 leading-relaxed text-left mx-auto max-w-prose">
          When life got too much to bear and everything felt stuck, it was art
          that kept me going. Slowly, I found my groove again — not just in art,
          but in myself.
        </p>
        <p className="text-body-md text-on-surface-variant mb-4 leading-relaxed text-left mx-auto max-w-prose">
          What started with simply getting back to creating grew into building a
          community that appreciated my art, and eventually, into starting my own
          small business.
        </p>
        <p className="text-body-md text-on-surface-variant mb-4 leading-relaxed text-left mx-auto max-w-prose">
          It&apos;s been a rollercoaster ride — messy, chaotic, beautiful, and
          everything in between. But through it all, there&apos;s been me and
          this little art kid inside me, figuring it all out together.
        </p>
        <p className="text-body-md text-on-surface-variant mb-8 leading-relaxed text-left mx-auto max-w-prose">
          And honestly, we wouldn&apos;t have it any other way.
        </p>
      </div>
      <div className="order-1 md:order-2 flex justify-center">
        <div className="relative w-full max-w-64">
          <div className="aspect-square rounded-2xl overflow-hidden shadow-2xl border-[8px] border-white ring-4 ring-candy-pink/10 relative">
            <Image
              src={ABOUT_IMAGE}
              alt="The Art Speaks logo — an illustrated portrait in yellow and grey"
              width={ABOUT_IMAGE_PX}
              height={ABOUT_IMAGE_PX}
              sizes={`${ABOUT_IMAGE_PX}px`}
              className="object-cover"
            />
          </div>
          <div className="absolute -bottom-5 right-0 sm:-bottom-6 sm:-right-5 w-24 h-24 bg-candy-pink rounded-full flex items-center justify-center p-3 text-center text-on-primary-container text-[10px] leading-tight font-black uppercase rotate-12 shadow-xl border-4 border-white animate-bounce">
            Handmade with soul
          </div>
        </div>
      </div>
    </section>
  );
}
