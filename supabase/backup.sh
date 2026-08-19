#!/usr/bin/env bash
# Take a full backup of the Supabase database.
#
# WHY THIS EXISTS
#
# The free plan gives no automated backups worth relying on. Most of what is in
# there could be rebuilt — products can be re-entered, images are in Storage —
# but two things could not:
#
#   sales_history   six months of pre-launch takings, typed in by hand from a
#                   notebook and existing nowhere else
#   orders          real customers, real addresses, and the stock movements
#                   that follow from them
#
# SETUP (once)
#
#   brew install libpq
#   echo 'export PATH="/opt/homebrew/opt/libpq/bin:$PATH"' >> ~/.zshrc
#   source ~/.zshrc
#
# Then get the connection string: Supabase dashboard -> Project Settings ->
# Database -> Connection string -> URI. Use the SESSION POOLER one if you are on
# a network without IPv6, which most home connections are.
#
# It contains the database password, so keep it out of the repo:
#
#   echo 'SUPABASE_DB_URL="postgresql://postgres.xxx:PASSWORD@host:5432/postgres"' >> .env.backup
#
# USAGE
#
#   ./supabase/backup.sh
#
# Writes backups/art-speaks-YYYY-MM-DD-HHMM.sql.gz. That directory is
# gitignored — a dump contains customer names, addresses and phone numbers, and
# must never be committed.
#
# RESTORING
#
#   gunzip -c backups/art-speaks-....sql.gz | psql "$SUPABASE_DB_URL"
#
# Restore into a NEW project first and look at it. Restoring over a live
# database is how a bad backup becomes a bad outage.
set -euo pipefail
cd "$(dirname "$0")/.."

if [ -f .env.backup ]; then
  # shellcheck disable=SC1091
  source .env.backup
fi

if [ -z "${SUPABASE_DB_URL:-}" ]; then
  echo "SUPABASE_DB_URL is not set. See the setup notes at the top of this file." >&2
  exit 1
fi

if ! command -v pg_dump >/dev/null 2>&1; then
  echo "pg_dump not found. Install it with:  brew install libpq" >&2
  echo "then add it to your PATH — see the setup notes at the top of this file." >&2
  exit 1
fi

mkdir -p backups
OUT="backups/art-speaks-$(date +%Y-%m-%d-%H%M).sql.gz"

# --no-owner and --no-privileges: the dump is for getting the DATA back, and
# Supabase's roles differ between projects. Without these, restoring into a
# fresh project fails on roles that do not exist there.
pg_dump "$SUPABASE_DB_URL" \
  --no-owner \
  --no-privileges \
  --schema=public \
  | gzip > "$OUT"

echo "wrote $OUT ($(du -h "$OUT" | cut -f1))"
echo
echo "Row counts in this dump:"
gunzip -c "$OUT" | grep -c "^INSERT\|^COPY" | xargs -I{} echo "  {} data statements"
