import { createClient } from "@/lib/supabase/client";

export const BUCKET = "product-images";

/** Longest edge, in pixels. Covers the product modal at 2x DPR with room spare. */
const MAX_EDGE = 1600;
const JPEG_QUALITY = 0.82;

/**
 * Shrinks a photo in the browser before it is uploaded.
 *
 * Phone photos arrive at 3–4 MB. Displayed a few hundred pixels wide, almost
 * all of that is discarded — but it still costs Storage quota, and next/image
 * re-downloads the full original once per size variant it generates. Doing this
 * at upload time means nobody has to remember to run a script.
 */
async function shrink(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const longest = Math.max(bitmap.width, bitmap.height);

  // Never scale up — that adds bytes and invents detail that was not captured.
  const scale = longest > MAX_EDGE ? MAX_EDGE / longest : 1;
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    throw new Error("Could not prepare the image for upload.");
  }
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error("Could not compress the image.")),
      "image/jpeg",
      JPEG_QUALITY,
    );
  });
}

/**
 * Uploads a product photo and returns its public URL.
 *
 * The filename carries a random suffix rather than being just the slug. Every
 * cache in the chain — the browser, Supabase's CDN, next/image — keys on the
 * URL, so re-uploading under the same name leaves stale pictures on screen for
 * up to an hour with no way to force a refresh. A fresh name each time makes
 * that impossible.
 */
export async function uploadProductImage(
  file: File,
  slug: string,
): Promise<string> {
  const blob = await shrink(file);
  const suffix = Math.random().toString(36).slice(2, 8);
  const path = `${slug || "product"}-${suffix}.jpg`;

  const supabase = createClient();
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, blob, { contentType: "image/jpeg", upsert: false });

  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
