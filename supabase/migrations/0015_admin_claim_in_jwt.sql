-- ============================================================
-- Put is_admin into the access token, so the guard costs no round trip.
--
-- Every admin page calls requireAdmin(), which read profiles.is_admin from the
-- database on each request. Measured against this project that is ~600ms — and
-- it sits in front of the render, so nothing paints until it returns. On a slow
-- link the studio felt sluggish for a boolean that changes once a year.
--
-- Supabase can run a function while it mints an access token (an "auth hook"),
-- and whatever that function adds to `claims` is signed into the JWT. The app
-- already verifies tokens locally against the project's JWKS, so reading a
-- claim is pure arithmetic — no network at all.
--
-- WHAT THIS DOES NOT DO
--
-- It does not move the security boundary. RLS still decides every read and
-- write, and RLS reads profiles directly (see 0003) — it does not consult the
-- token. This claim only decides what *renders*.
--
-- That distinction is what makes the staleness acceptable: tokens live about an
-- hour, so revoking someone's admin flag can leave them seeing the studio UI
-- until their token refreshes. They cannot *do* anything with it — every query
-- behind those screens is refused by RLS the moment the flag flips. If you ever
-- need an instant lockout, delete their session (Auth → Users → sign out) and
-- the next request re-mints the token.
--
-- The app treats only a `true` claim as authoritative and falls back to the
-- database otherwise, so granting admin still takes effect immediately.
--
-- AFTER APPLYING THIS you must enable the hook:
--   Dashboard → Authentication → Hooks → Customize Access Token (JWT) Claims
--   → Postgres → public.custom_access_token_hook → Enable.
-- Until then this migration is inert: the claim is simply absent and the app
-- keeps reading the database exactly as before.
--
-- Idempotent: safe to run more than once.
-- ============================================================

-- ---------- the hook ----------
-- `event` arrives as {"user_id": "...", "claims": {...}, ...} and whatever we
-- return under `claims` is signed into the token.
--
-- SECURITY DEFINER because it runs as supabase_auth_admin, which has no
-- business holding a general grant on application tables. search_path is
-- pinned: a SECURITY DEFINER function with a mutable search_path can be
-- hijacked by anyone able to create a schema.
create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  is_admin_flag boolean;
  claims jsonb;
begin
  select p.is_admin
    into is_admin_flag
    from public.profiles p
   where p.id = (event->>'user_id')::uuid;

  claims := coalesce(event->'claims', '{}'::jsonb);

  -- coalesce: a user with no profile row yet is not an admin, and the claim
  -- must still be present and false rather than null, or the app cannot tell
  -- "not an admin" from "hook never ran".
  claims := jsonb_set(
    claims,
    '{is_admin}',
    to_jsonb(coalesce(is_admin_flag, false))
  );

  return jsonb_set(event, '{claims}', claims);
end;
$$;

-- ---------- who may run it ----------
-- Only the auth server. Left executable by `public`, any logged-in user could
-- call it over PostgREST — harmless in itself (it only reads), but it is a
-- SECURITY DEFINER function and those should have the narrowest possible
-- caller list.
revoke execute on function public.custom_access_token_hook(jsonb) from public;
revoke execute on function public.custom_access_token_hook(jsonb) from anon;
revoke execute on function public.custom_access_token_hook(jsonb) from authenticated;

grant usage on schema public to supabase_auth_admin;
grant execute on function public.custom_access_token_hook(jsonb) to supabase_auth_admin;

-- ---------- letting the hook see profiles ----------
-- The function is SECURITY DEFINER so it runs as the owner and bypasses RLS,
-- but the auth server still needs the table grant to invoke it cleanly.
grant select on table public.profiles to supabase_auth_admin;

-- Belt and braces: if this function is ever changed to SECURITY INVOKER, this
-- policy is what keeps the hook working instead of silently returning null for
-- every user — which would read as "nobody is an admin" and lock the studio.
drop policy if exists "auth admin can read profiles" on public.profiles;
create policy "auth admin can read profiles"
  on public.profiles for select
  to supabase_auth_admin
  using (true);
