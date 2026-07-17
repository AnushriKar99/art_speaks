import Image from "next/image";
import { BadgeSticker } from "@/components/ui/badge-sticker";

const ABOUT_IMAGE = "/images/journey.png";

export function AboutSection() {
  return (
    <section className="px-margin-mobile md:px-margin-desktop mb-16 grid md:grid-cols-2 gap-12 items-center relative py-12">
      <div className="absolute inset-0 checkered-pattern-mint opacity-20 z-[-1] rounded-[60px]" />
      <div className="order-2 md:order-1 relative">
        <BadgeSticker className="mb-4">Hello!</BadgeSticker>
        <span className="text-label-caps font-label-caps text-primary uppercase tracking-[0.1em] mb-1 block">
          The Artist
        </span>
        <h3 className="text-headline-md font-headline-md text-on-surface mb-6">
          My Journey
        </h3>
        <p className="text-body-md text-on-surface-variant mb-4 leading-relaxed font-medium">
          It started with a single brushstroke and a need to speak without
          words. _a_r_t_speaks began as a personal journal in 2021, and has
          since grown into a community of people who appreciate the tactile and
          the thoughtful.
        </p>
        <p className="text-body-md text-on-surface-variant mb-8 leading-relaxed">
          My workspace is a chaotic collection of dried flowers, vintage beads,
          and too many sketchbooks to count. I wouldn&apos;t have it any other
          way.
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
