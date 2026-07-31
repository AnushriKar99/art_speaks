import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AccountMenuClient } from "@/components/layout/account-menu-client";
import { Icon } from "@/components/ui/icon";

/**
 * The storefront's account control. Server component so the signed-in state is
 * correct on first paint — no flash of "signed out" while the browser checks.
 *
 * Rendered by the pages and passed into the (client) headers as a prop, since a
 * Server Component can't be imported by a Client Component directly.
 */
export async function AccountMenu() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <Link
        href="/login"
        aria-label="Sign in"
        className="text-primary hover:scale-105 transition-transform duration-200 active:scale-95 flex"
      >
        <Icon name="person" />
      </Link>
    );
  }

  // RLS limits this to the caller's own row, so it can't be used to probe
  // anyone else's admin status.
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  return (
    <AccountMenuClient email={user.email ?? ""} isAdmin={!!profile?.is_admin} />
  );
}
