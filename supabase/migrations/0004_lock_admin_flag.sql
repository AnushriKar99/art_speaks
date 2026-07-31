-- ============================================================
-- Lock the is_admin flag against self-assignment.
--
-- 0003 added profiles.is_admin. 0001 already grants every user UPDATE on
-- their own profile row ("own profile is updatable", USING auth.uid() = id).
-- RLS gates ROWS, not COLUMNS — and Supabase grants `authenticated` UPDATE
-- on all columns by default. So before this migration any logged-in user
-- could simply:
--
--   PATCH /rest/v1/profiles?id=eq.<their own id>   {"is_admin": true}
--
-- ...and become an admin. With public signup enabled that means anyone.
--
-- Postgres has no column-level RLS, so the fix is column-level GRANTs.
-- A table-level UPDATE grant implies every column, so the broad grant must
-- be revoked FIRST and then re-issued for the columns a user may legitimately
-- edit. is_admin is left out, so it becomes writable only by the service role
-- and by the admin policies from 0003.
--
-- Idempotent: revoke/grant are declarative, safe to run more than once.
-- ============================================================

-- ---------- authenticated ----------
revoke update on public.profiles from authenticated;

grant update (full_name, phone, shipping_address)
  on public.profiles to authenticated;

-- ---------- anon ----------
-- RLS already blocks anon (auth.uid() is null, so no row matches), but revoking
-- the grant means a future policy change can't silently open this back up.
revoke update on public.profiles from anon;
