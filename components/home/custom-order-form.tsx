"use client";

import { useState } from "react";
import Image from "next/image";
import { BadgeSticker } from "@/components/ui/badge-sticker";
import { buildWhatsAppLink } from "@/lib/contact";

const FORM_IMAGE =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuD5gH9anw7guM28PHpEmr9urL_8EJCoflT5JvH7I75AmUD0_h_mGyBg0pHAhSXtvOjAovIwMItxrh4uvdEm_xLIPYOhTHmyNudcjdsxvqDNhqVViqgtENw_cTMenDTa6MPACt0ktzfnAFrkegcdXZn7VIWDmLeMx5cpPO6idi2OxnbXmzM2Os-QbamhIMNIo5aoUnixrRFuWR9oh_zUXG0-BfvjznugLzLZFMe3VZxQ-q-ib3jA2YjGqw";

export function CustomOrderForm() {
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
          <div className="hidden md:block">
            <Image
              className="rounded-[2.5rem] w-full h-56 object-cover border-4 border-white shadow-lg"
              src={FORM_IMAGE}
              alt="Custom handcrafted pieces"
              width={500}
              height={224}
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
                const message = `Category: ${category}\nDescription: ${description}`;
                window.open(buildWhatsAppLink(message), "_blank", "noopener,noreferrer");
                setSubmitted(true);
              }}
            >
              <div>
                <label className="block text-label-caps font-bold text-primary mb-2 uppercase text-[10px] tracking-widest">
                  Pick a Category
                </label>
                <select
                  name="category"
                  className="w-full bg-white border-2 border-candy-pink/20 rounded-2xl py-3 px-4 focus:ring-primary focus:border-primary outline-none text-body-md shadow-sm"
                  defaultValue="Phone Charms"
                >
                  <option>Phone Charms</option>
                  <option>Worry Stones</option>
                  <option>Bookmarks</option>
                  <option>Trinkets</option>
                  <option>Others</option>
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
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
