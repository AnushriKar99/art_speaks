-- ============================================================
-- The product-images bucket, and the policies protecting it.
--
-- These existed only in setup_footer.sql.in, which feeds the generated
-- setup_new_project.sql — so a project rebuilt from migrations/ alone got a
-- PUBLIC BUCKET WITH NO WRITE POLICY. Raised in review on PR #1.
--
-- That matters more here than it would elsewhere. lib/images/upload.ts calls
-- Supabase Storage straight from the browser with the visitor's own session:
-- it never passes through a Server Action, so requireAdmin() is never
-- consulted, and the middleware only decides which pages render — not which
-- Storage endpoints a token may call.
--
-- RLS on storage.objects is therefore the ONLY thing standing between a
-- signed-up customer and write access to the bucket. It belongs in the schema
-- history, not in a generated file.
--
-- Idempotent: safe to run more than once.
-- ============================================================

-- ---------- the bucket ----------
-- Created here rather than by hand in the dashboard, so a project can be
-- rebuilt from migrations without a manual step that is easy to forget.
-- Public read: product photos are meant to be seen, and signed URLs would add
-- expiry handling for no benefit while breaking next/image caching.
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do update set public = true;

-- ---------- read ----------
drop policy if exists "product images are public" on storage.objects;
create policy "product images are public"
  on storage.objects for select
  using (bucket_id = 'product-images');

-- ---------- write ----------
-- Gated on the same is_admin() helper the table policies use, so there is one
-- definition of "is an admin" rather than two that can drift.
drop policy if exists "admins manage product images" on storage.objects;
create policy "admins manage product images"
  on storage.objects for all
  using (bucket_id = 'product-images' and public.is_admin())
  with check (bucket_id = 'product-images' and public.is_admin());

-- ---------- check ----------
--   select policyname, cmd from pg_policies
--   where schemaname = 'storage' and tablename = 'objects';
-- Two rows. None means the bucket is open to any authenticated caller.
