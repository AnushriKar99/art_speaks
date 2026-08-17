#!/usr/bin/env bash
# Regenerate setup_new_project.sql from the migrations and seeds.
#
# That file is a convenience bundle for standing up a fresh Supabase project
# in one paste. It is generated, so run this after changing any migration or
# seed — otherwise the bundle and its sources drift apart and a new project
# gets built from stale SQL.
#
#   ./supabase/build_setup.sh
#
# Note: the seeds listed below are the only ones. An older seed.sql was deleted
# — it truncated six tables including orders, while its header claimed it was
# "safe to re-run".
set -euo pipefail
cd "$(dirname "$0")/.."

OUT=supabase/setup_new_project.sql

# Migrations are globbed, not listed. They were listed by hand until 0015,
# which meant every new migration had to be added in two places and the bundle
# silently stayed correct-looking while missing the newest file. The numbered
# prefixes sort lexically, which is exactly the order they must be applied in.
#
# Seeds stay explicit: they are not numbered, and categories must land before
# the products that reference them.
FILES=(
  supabase/migrations/[0-9]*.sql
  supabase/seed_categories.sql
  supabase/seed_products_bookmarks.sql
)

{
  cat supabase/setup_header.sql.in
  for f in "${FILES[@]}"; do
    printf '\n\n-- ####################################################################\n'
    printf -- '-- ### %s\n' "$f"
    printf -- '-- ####################################################################\n\n'
    cat "$f"
  done
  cat supabase/setup_footer.sql.in
} > "$OUT"

echo "wrote $OUT ($(wc -l < "$OUT" | tr -d ' ') lines from ${#FILES[@]} sources)"
