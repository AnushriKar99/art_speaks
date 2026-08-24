"use client";

import { useState } from "react";
import Image from "next/image";
import { BadgeSticker } from "@/components/ui/badge-sticker";
import { buildWhatsAppLink } from "@/lib/contact";
import type { Category } from "@/lib/types";

/** The studio desk. Served from the repo rather than Storage — it is site
 *  chrome, not product data, so it belongs with the code that renders it. */
const FORM_IMAGE = "/images/custom-order.jpg";

export function CustomOrderForm({ categories }: { categories: Category[] }) {
  const [submitted, setSubmitted] = useState(false);

  return (
    <section
      id="custom-orders"
      className="px-margin-mobile md:px-margin-desktop mb-16 relative scroll-mt-20"
    >
      <div className="bg-white/80 backdrop-blur-sm rounded-[40px] p-8 flex flex-col md:flex-row gap-10 items-center border-4 border-candy-pink/20 relative z-10 overflow-hidden shadow-xl">
        <div className="absolute -top-10 -right-10 w-40 h-40 checkered-pattern opacity-30 rotate-12" />
        <div className="md:w-1/2 relative">
          <BadgeSticker className="mb-4">Custom Magic</BadgeSticker>
          <h3 className="text-headline-md font-headline-md text-primary mb-4">
            Something uniquely yours
          </h3>
          <p className="text-body-md text-on-surface-variant mb-6 leading-relaxed">
            I love collaborating on custom pieces. Whether it&apos;s a surprise
            for your loved ones or something special for yourself, let&apos;s
            create something together.
          </p>
          <div>
            {/* Shorter on a phone: at full height the photo pushes the form
                itself below the fold, and the form is what this section is for. */}
            <Image
              className="rounded-[2rem] md:rounded-[2.5rem] w-full h-40 md:h-56 object-cover border-4 border-white shadow-lg"
              src={FORM_IMAGE}
              alt="The studio desk — gouache, brush pens, framed paintings and stickers mid-project"
              sizes="(min-width: 768px) 32rem, 100vw"
              width={1400}
              height={782}
            />
          </div>
        </div>
        <div className="md:w-1/2 w-full bg-surface-container-low p-8 rounded-[2rem] shadow-inner border-2 border-white">
          {submitted ? (
            <div className="text-center py-10">
              <BadgeSticker className="mb-4">Sent!</BadgeSticker>
              <h4 className="text-headline-md font-headline-md text-primary mb-2">
                Almost there!
              </h4>
              <p className="text-body-md text-on-surface-variant">
                We&apos;ve opened WhatsApp with your request filled in — just
                hit send and I&apos;ll get back to you soon. 💌
              </p>
            </div>
          ) : (
            <form
              className="space-y-5"
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const category = formData.get("category");
                const description = formData.get("description");
                // Prefixed so the studio can tell an enquiry from an order at a
                // glance — both arrive in the same WhatsApp thread.
                const message = `Custom order request:\n\nCategory: ${category}\nDescription: ${description}`;
                window.open(buildWhatsAppLink(message), "_blank", "noopener,noreferrer");
                setSubmitted(true);
              }}
            >
              <div>
                <label className="block text-label-caps font-bold text-primary mb-2 uppercase text-[10px] tracking-widest">
                  Pick a Category
                </label>
                {/* Real categories from the DB, not a hand-typed list that
                    drifts from what the shop actually sells. It had "Worry
                    Stones" where the real category is "Keychains/Worry
                    Stones", and no entry at all for Paintings, Bag Charms,
                    Fridge Magnets, Tote Bags or Stickers — five of eight
                    categories were simply not choosable.

                    "Something else" stays as a fixed option after the real
                    ones: a custom piece is by definition allowed not to fit
                    an existing shelf, which is a different case from the list
                    having gone stale. */}
                <select
                  name="category"
                  className="w-full bg-white border-2 border-candy-pink/20 rounded-2xl py-3 px-4 focus:ring-primary focus:border-primary outline-none text-body-md shadow-sm"
                  defaultValue={categories[0]?.name}
                >
                  {categories.map((c) => (
                    <option key={c.id}>{c.name}</option>
                  ))}
                  <option>Something else</option>
                </select>
              </div>
              <div>
                <label className="block text-label-caps font-bold text-primary mb-2 uppercase text-[10px] tracking-widest">
                  Your Vision
                </label>
                <textarea
                  name="description"
                  required
                  rows={4}
                  className="w-full bg-white border-2 border-candy-pink/20 rounded-2xl py-3 px-4 focus:ring-primary focus:border-primary outline-none text-body-md shadow-sm"
                  placeholder="Tell me about colors, themes, or a special meaning..."
                />
              </div>
              <button
                type="submit"
                className="w-full bg-primary text-white py-4 rounded-full font-label-caps text-label-caps tactile-button shadow-lg"
              >
                Request Custom Piece
              </button>
              {/* A wider window than the cart's 2–3 weeks: a custom piece has
                  to be discussed and designed before any of it can be made. */}
              <p className="text-center text-body-md text-on-surface-variant">
                Custom pieces take 2–4 weeks to make and ship.
              </p>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
