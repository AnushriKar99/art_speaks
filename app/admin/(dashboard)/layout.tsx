import { redirect } from "next/navigation";
import Link from "next/link";
import { requireAdmin } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { AdminNavDesktop, AdminNavMobile } from "@/components/admin/admin-nav";
import { Icon } from "@/components/ui/icon";

/**
 * Guarded shell for the studio side. Everything inside the (dashboard) route
 * group inherits this layout, so pages don't repeat the guard.
 *
 * The login page deliberately sits OUTSIDE this group (app/admin/login) — if it
 * were inside, the guard would bounce you away from the page you use to get in.
 *
 * This guard is UX, not security: it decides what renders, but it can't stop a
 * crafted request to a Server Action. The real boundary is the RLS from
 * migration 0003, which is why every write here goes through the admin's own
 * session rather than the service-role key.
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAdmin();

  async function signOut() {
    "use server";
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect("/admin/login");
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-surface-container-lowest/95 backdrop-blur border-b-2 border-candy-pink/40">
        <div className="max-w-container-max mx-auto px-margin-mobile lg:px-margin-desktop h-16 flex items-center gap-4">
          <Link
            href="/admin"
            className="flex items-center gap-2.5 shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary rounded"
          >
            <span className="font-headline-md text-headline-md text-primary leading-none">
              Art Speaks
            </span>
            {/* Signature: the shop's own sticker vocabulary, used once, to mark
                that you're backstage rather than on the storefront. */}
            <span className="badge-sticker !py-1 !px-2.5 !text-[10px] !border-2 rotate-[-4deg] bg-candy-pink text-on-primary-fixed">
              Studio
            </span>
          </Link>

          <div className="flex-1" />

          <AdminNavDesktop />

          <div className="flex items-center gap-3 shrink-0">
            <span
              className="hidden sm:block text-body-md text-on-surface-variant max-w-[16ch] truncate"
              title={user.email}
            >
              {user.email}
            </span>
            <form action={signOut}>
              <button
                type="submit"
                className="squishy flex items-center gap-1.5 rounded-full border-2 border-outline-variant px-3 py-1.5 text-primary font-label-caps text-label-caps uppercase tracking-wider hover:bg-surface-container-high transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                <Icon name="logout" className="text-[18px]" />
                <span className="hidden sm:inline">Sign out</span>
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* pb-24 clears the fixed mobile tab bar. */}
      <main className="max-w-container-max mx-auto px-margin-mobile lg:px-margin-desktop py-8 pb-24 lg:pb-8">
        {children}
      </main>

      <AdminNavMobile />
    </div>
  );
}
