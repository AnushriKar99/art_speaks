import Image from "next/image";
import { BadgeSticker } from "@/components/ui/badge-sticker";

const ABOUT_IMAGE = "/images/journey.png";

export function AboutSection() {
  return (
    <section className="px-margin-mobile md:px-margin-desktop mb-16 grid md:grid-cols-2 gap-12 items-center relative py-12">
      <div className="absolute inset-0 checkered-pattern-mint opacity-20 z-[-1] rounded-[60px]" />
      <div className="order-2 md:order-1 relative">
        <BadgeSticker className="mb-4">Hello!</BadgeSticker>
        <h3 className="text-headline-md font-headline-md text-on-surface mb-6">
          An Art Kid&apos;s Journey of Survival
        </h3>
        <p className="text-body-md text-on-surface-variant mb-4 leading-relaxed font-medium">
          It started in lockdown, when not only was the world locked inside, but
          so was my life.
        </p>
        <p className="text-body-md text-on-surface-variant mb-4 leading-relaxed">
          When life got too much to bear and everything felt stuck, it was art
          that kept me going. Slowly, I found my groove again — not just in art,
          but in myself.
        </p>
        <p className="text-body-md text-on-surface-variant mb-4 leading-relaxed">
          What started with simply getting back to creating grew into building a
          community that appreciated my art, and eventually, into starting my own
          small business.
        </p>
        <p className="text-body-md text-on-surface-variant mb-4 leading-relaxed">
          It&apos;s been a rollercoaster ride — messy, chaotic, beautiful, and
          everything in between. But through it all, there&apos;s been me and
          this little art kid inside me, figuring it all out together.
        </p>
        <p className="text-body-md text-on-surface-variant mb-8 leading-relaxed">
          And honestly, we wouldn&apos;t have it any other way.
        </p>
      </div>
      <div className="order-1 md:order-2 flex justify-center">
        <div className="relative w-full max-w-sm">
          <div className="aspect-[3/4] rounded-[5rem] overflow-hidden shadow-2xl border-[8px] border-white ring-4 ring-candy-pink/10 relative">
            <Image
              src={ABOUT_IMAGE}
              alt="The artist at work in the studio"
              fill
              sizes="(min-width: 768px) 24rem, 100vw"
              className="object-cover"
            />
          </div>
          <div className="absolute -bottom-8 -right-4 w-32 h-32 bg-candy-pink rounded-full flex items-center justify-center p-6 text-center text-on-primary-container text-[11px] font-black uppercase rotate-12 shadow-xl border-4 border-white animate-bounce">
            Handmade with soul
          </div>
        </div>
      </div>
    </section>
  );
}
