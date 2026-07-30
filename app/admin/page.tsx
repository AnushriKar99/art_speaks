import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";

async function signOut() {
  "use server";
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}

export default async function AdminHomePage() {
  // Guard: redirects to /admin/login unless the caller is a flagged admin.
  const user = await requireAdmin();

  return (
    <main className="min-h-screen flex items-center justify-center px-margin-mobile bg-background">
      <div className="w-full max-w-md bg-surface-container-lowest rounded-[2rem] p-8 border-2 border-candy-pink/30 shadow-xl text-center">
        <p className="text-4xl mb-3">🎀</p>
        <h1 className="text-headline-md font-headline-md text-primary mb-2">
          Logged in as admin ✓
        </h1>
        <p className="text-body-md text-on-surface-variant mb-6 break-words">
          {user.email}
        </p>
        <p className="text-body-md text-on-surface-variant mb-8">
          The admin dashboard is coming soon. From here you&apos;ll manage
          products, categories, and orders.
        </p>

        <form action={signOut}>
          <button
            type="submit"
            className="tactile-button rounded-2xl bg-surface-container-high text-primary font-headline-md px-6 py-3 text-body-md"
          >
            Sign out
          </button>
        </form>
      </div>
    </main>
  );
}
