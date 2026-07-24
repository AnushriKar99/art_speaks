-- ============================================================
-- Add editorial product flags: is_best_seller, is_new_arrival.
--
-- Run this against a database that was created with the ORIGINAL
-- 0001 (before these columns existed). Idempotent (IF NOT EXISTS),
-- so it's a no-op if 0001 already includes them.
-- ============================================================

alter table public.products
  add column if not exists is_best_seller boolean not null default false;

alter table public.products
  add column if not exists is_new_arrival boolean not null default false;
