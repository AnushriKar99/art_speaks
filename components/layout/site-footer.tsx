import Image from "next/image";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";

const LOGO_SRC =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuC8CWM2T1pTe7YX52FI6aJ1fk6IJKoeTIHagzarw8fUhcbo-iUruIDsKjtq0woXN33YpVzqYDSv_h_AfKy8LtVi1jKOCyQABEEYdZEB7jyeO0efhofGcXrP4bMUXckCN7vUIayJUKJJniIGautEliibwhuA4lclUKsrca1EGYSofv9W-Fua8uaFH1TIyZTEBYiuTTIblSCkS26uCfkTre3mZK5IKtXiFaDsundLMx56ldX6_Ysm-aGJazGROn2WmICpZzE";

export function SiteFooter() {
  return (
    <footer className="bg-white w-full py-8 px-margin-mobile border-t-8 border-candy-pink/10 relative overflow-hidden">
      <div className="absolute inset-0 checkered-pattern opacity-10 pointer-events-none" />
      <div className="max-w-6xl mx-auto flex flex-col items-center gap-4 text-center relative z-10">
        <div className="flex items-center gap-3">
          <Image
            alt="Art Speaks logo"
            className="w-12 h-12 rounded-full border-4 border-candy-pink shadow-md"
            src={LOGO_SRC}
            width={48}
            height={48}
          />
          <h2 className="font-display-lg text-headline-md italic text-primary">
            Art Speaks
          </h2>
        </div>
        <p className="text-body-md text-on-surface-variant max-w-sm font-medium">
          Small items, big feelings. Handcrafted art studio where every piece
          tells a story.
        </p>
        <div className="flex flex-wrap justify-center gap-8">
          {/* TODO: real links pending — placeholder hrefs for now. */}
          <Link
            className="text-primary font-black hover:text-candy-pink underline decoration-4 decoration-candy-pink/30 underline-offset-4 transition-all"
            href="#"
          >
            Email
          </Link>
          <Link
            className="text-primary font-black hover:text-candy-pink underline decoration-4 decoration-mint-green/30 underline-offset-4 transition-all"
            href="#"
          >
            Instagram
          </Link>
          <Link
            className="text-primary font-black hover:text-candy-pink underline decoration-4 decoration-lavender-dream/30 underline-offset-4 transition-all"
            href="#"
          >
            WhatsApp
          </Link>
        </div>
        <div className="w-full pt-4 border-t-2 border-candy-pink/10 flex flex-col items-center gap-3">
          <div className="flex gap-6">
            <Icon name="payments" className="text-primary/40 text-3xl" />
            <Icon name="shopping_bag" className="text-primary/40 text-3xl" />
            <Icon name="local_shipping" className="text-primary/40 text-3xl" />
          </div>
          <div className="text-label-caps font-bold text-on-surface-variant/40 tracking-widest">
            © 2024 Art Speaks.
          </div>
        </div>
      </div>
    </footer>
  );
}
