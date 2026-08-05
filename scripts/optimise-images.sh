#!/usr/bin/env bash
# Shrink product photos before uploading them to Supabase Storage.
#
# Phone photos come off the camera at 3–4 MB. On a product card they are
# displayed a few hundred pixels wide, so almost all of that is thrown away —
# but it still costs Storage quota, egress every time next/image fetches the
# original to resize, and a slow first render.
#
#   ./scripts/optimise-images.sh ~/Desktop/product-photos
#
# Writes to <folder>/optimised/ and never touches your originals. Upload the
# contents of that folder.
#
# Uses sips, which ships with macOS — no install needed.
set -euo pipefail

SRC="${1:-}"
MAX_EDGE="${MAX_EDGE:-1200}"   # longest side in pixels
QUALITY="${QUALITY:-80}"       # JPEG quality, 0-100

if [ -z "$SRC" ] || [ ! -d "$SRC" ]; then
  echo "usage: $0 <folder-of-images>" >&2
  echo "  optional: MAX_EDGE=1600 QUALITY=85 $0 <folder>" >&2
  exit 1
fi

OUT="$SRC/optimised"
mkdir -p "$OUT"

shopt -s nullglob nocaseglob
files=("$SRC"/*.jpg "$SRC"/*.jpeg "$SRC"/*.png)
shopt -u nocaseglob

if [ ${#files[@]} -eq 0 ]; then
  echo "no .jpg/.jpeg/.png files in $SRC" >&2
  exit 1
fi

printf '%-38s %10s %10s %7s\n' "file" "before" "after" "saved"
printf '%s\n' "--------------------------------------------------------------------"

total_before=0
total_after=0

for f in "${files[@]}"; do
  name=$(basename "$f")
  # Everything becomes .jpg — photos have no use for PNG's lossless overhead.
  target="${name%.*}.jpg"

  before=$(stat -f%z "$f")

  # sips -Z scales the longest edge TO the target, which means it happily
  # upscales an image that was already smaller — adding bytes and inventing
  # detail. Only resize when there is something to shrink.
  w=$(sips -g pixelWidth  "$f" 2>/dev/null | awk '/pixelWidth/{print $2}')
  h=$(sips -g pixelHeight "$f" 2>/dev/null | awk '/pixelHeight/{print $2}')
  longest=$(( w > h ? w : h ))

  if [ "$longest" -gt "$MAX_EDGE" ]; then
    sips -Z "$MAX_EDGE" -s format jpeg -s formatOptions "$QUALITY" \
         "$f" --out "$OUT/$target" >/dev/null 2>&1
  else
    sips -s format jpeg -s formatOptions "$QUALITY" \
         "$f" --out "$OUT/$target" >/dev/null 2>&1
  fi

  after=$(stat -f%z "$OUT/$target")

  total_before=$((total_before + before))
  total_after=$((total_after + after))

  pct=$(( 100 - (after * 100 / before) ))
  printf '%-38s %9sK %9sK %6s%%\n' "$target" $((before/1024)) $((after/1024)) "$pct"
done

printf '%s\n' "--------------------------------------------------------------------"
printf '%-38s %9sK %9sK %6s%%\n' "TOTAL" \
  $((total_before/1024)) $((total_after/1024)) \
  $(( 100 - (total_after * 100 / total_before) ))
echo
echo "Optimised files are in: $OUT"
echo "Upload those to Storage → product-images, keeping the slug filenames."
