#!/usr/bin/env bash
# Regenerate SETUP_NEW_PROJECT.sql from the migrations and seeds.
#
# That file is a convenience bundle for standing up a fresh Supabase project
# in one paste. It is generated, so run this after changing any migration or
# seed — otherwise the bundle and its sources drift apart and a new project
# gets built from stale SQL.
#
#   ./supabase/build-setup.sh
#
# Note: the seeds listed below are the only ones. An older seed.sql was deleted
# — it truncated six tables including orders, while its header claimed it was
# "safe to re-run".
set -euo pipefail
cd "$(dirname "$0")/.."

OUT=supabase/SETUP_NEW_PROJECT.sql

FILES=(
  supabase/migrations/0001_initial_schema.sql
  supabase/migrations/0002_add_product_flags.sql
  supabase/migrations/0003_admin_role.sql
  supabase/migrations/0004_lock_admin_flag.sql
  supabase/migrations/0005_currency_inr.sql
  supabase/migrations/0006_sales_schema.sql
  supabase/migrations/0007_products_in_rupees_view.sql
  supabase/migrations/0008_fuzzy_product_search.sql
  supabase/migrations/0009_record_offline_sale.sql
  supabase/migrations/0010_whatsapp_orders.sql
  supabase/migrations/0011_place_whatsapp_order.sql
  supabase/migrations/0012_fix_place_whatsapp_order.sql
  supabase/migrations/0014_order_stock_consistency.sql
  supabase/seed_categories.sql
  supabase/seed_products_bookmarks.sql
)

{
  cat supabase/setup-header.sql.in
  for f in "${FILES[@]}"; do
    printf '\n\n-- ####################################################################\n'
    printf -- '-- ### %s\n' "$f"
    printf -- '-- ####################################################################\n\n'
    cat "$f"
  done
  cat supabase/setup-footer.sql.in
} > "$OUT"

echo "wrote $OUT ($(wc -l < "$OUT" | tr -d ' ') lines from ${#FILES[@]} sources)"
