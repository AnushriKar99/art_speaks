import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./env";

/**
 * A Supabase client with no session attached, for reading the public
 * storefront: products, categories.
 *
 * Two reasons this exists rather than reusing the cookie-backed server client.
 *
 * **Correctness.** RLS grants admins `for all` on products, which includes
 * SELECT — so an admin browsing the shop through the cookie client would see
 * inactive products that no customer can see. Reading as nobody guarantees the
 * storefront shows what a visitor actually gets.
 *
 * **Cacheability.** `unstable_cache` refuses to wrap anything that touches
 * `cookies()`, because the result would be shared across users. Without a
 * session there is nothing user-specific to leak, so these reads can be cached.
 *
 * Never use this for anything user-specific — wishlists, orders, the account
 * menu. Those need the session, and therefore `lib/supabase/server.ts`.
 */
export function createPublicClient() {
  return createSupabaseClient(
    SUPABASE_URL(),
    SUPABASE_ANON_KEY(),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
