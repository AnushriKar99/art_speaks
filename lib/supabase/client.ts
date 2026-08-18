import { createBrowserClient } from "@supabase/ssr";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./env";

/**
 * Supabase client for use in Client Components (auth, wishlist buttons, etc.).
 * Uses the public anon key, which is safe to ship to the browser.
 */
export function createClient() {
  return createBrowserClient(
    SUPABASE_URL(),
    SUPABASE_ANON_KEY(),
  );
}
