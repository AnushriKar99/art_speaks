"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Icon } from "@/components/ui/icon";

const itemClasses =
  "flex items-center gap-2.5 w-full text-left px-4 py-2.5 text-body-md text-primary hover:bg-surface-container-high transition-colors";

export function AccountMenuClient({
  email,
  isAdmin,
}: {
  email: string;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onEscape = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onEscape);
    };
  }, [open]);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    setOpen(false);
    router.push("/");
    router.refresh();
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Account"
        className="text-primary hover:scale-105 transition-transform duration-200 active:scale-95 relative flex"
      >
        <Icon name="person" filled />
        {/* Quiet marker that this account can reach the studio. */}
        {isAdmin ? (
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-candy-pink border border-surface-bright" />
        ) : null}
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-full mt-2 w-60 bg-surface-container-lowest border-2 border-candy-pink/40 rounded-2xl shadow-xl py-2 z-50"
        >
          <p className="px-4 pb-2 text-label-caps font-label-caps uppercase tracking-wide text-on-surface-variant truncate">
            {email}
          </p>

          {isAdmin ? (
            <Link href="/admin" role="menuitem" className={itemClasses} onClick={() => setOpen(false)}>
              <Icon name="dashboard" className="text-[20px]" />
              Admin Dashboard
            </Link>
          ) : null}

          <button type="button" role="menuitem" onClick={handleSignOut} className={itemClasses}>
            <Icon name="logout" className="text-[20px]" />
            Sign out
          </button>
        </div>
      ) : null}
    </div>
  );
}
