import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./env";

/**
 * Supabase client for use in Server Components, Route Handlers, and Server
 * Actions. Reads/writes the session via the request cookies (Next 16's
 * cookies() is async).
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    SUPABASE_URL(),
    SUPABASE_ANON_KEY(),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // setAll can be called from a Server Component, where cookies are
            // read-only. Safe to ignore when session refresh is handled in
            // middleware instead.
          }
        },
      },
    },
  );
}
