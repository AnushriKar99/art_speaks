import Image from "next/image";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { EMAIL_ADDRESS, INSTAGRAM_URL, buildWhatsAppLink } from "@/lib/contact";

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
        <div className="flex items-center justify-center gap-4">
          <Link
            href={`mailto:${EMAIL_ADDRESS}`}
            aria-label="Email"
            className="w-11 h-11 flex items-center justify-center rounded-full bg-candy-pink/10 text-primary hover:bg-candy-pink/30 hover:scale-105 active:scale-95 transition-all duration-200"
          >
            <Icon name="mail" />
          </Link>
          <Link
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Instagram"
            className="w-11 h-11 flex items-center justify-center rounded-full bg-mint-green/10 text-primary hover:bg-mint-green/30 hover:scale-105 active:scale-95 transition-all duration-200"
          >
            <svg
              viewBox="0 0 24 24"
              width="20"
              height="20"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
              <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
              <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
            </svg>
          </Link>
          <Link
            href={buildWhatsAppLink()}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="WhatsApp"
            className="w-11 h-11 flex items-center justify-center rounded-full bg-lavender-dream/10 text-primary hover:bg-lavender-dream/30 hover:scale-105 active:scale-95 transition-all duration-200"
          >
            <svg
              viewBox="0 0 24 24"
              width="20"
              height="20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.9 9.9 0 0 0 4.74 1.2h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2zm0 18.15h-.01a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.22 8.22 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.25-8.24a8.2 8.2 0 0 1 5.83 2.42 8.19 8.19 0 0 1 2.41 5.83c0 4.55-3.7 8.24-8.24 8.24zm4.52-6.17c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.17.24-.64.8-.78.97-.14.17-.29.19-.53.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.24-1.47-1.38-1.72-.15-.24-.02-.38.11-.5.11-.11.25-.29.37-.43.12-.15.16-.25.25-.41.08-.17.04-.31-.02-.44-.06-.12-.56-1.35-.77-1.84-.2-.49-.41-.42-.56-.43h-.48c-.17 0-.44.06-.66.31s-.87.85-.87 2.07.89 2.4 1.01 2.57c.13.16 1.75 2.67 4.24 3.74.59.26 1.05.41 1.41.52.6.19 1.14.16 1.57.1.48-.07 1.47-.6 1.68-1.18.2-.58.2-1.08.14-1.18-.06-.1-.23-.16-.48-.28z" />
            </svg>
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
