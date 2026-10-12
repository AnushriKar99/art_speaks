import { createClient } from "@/lib/supabase/client";

export const BUCKET = "product-images";

/** Longest edge, in pixels. 1400px provides crisp 2x retina clarity for product modals while keeping file sizes under 100KB. */
const MAX_EDGE = 1400;
const WEBP_QUALITY = 0.8;
const JPEG_QUALITY = 0.8;

type CompressedResult = {
  blob: Blob;
  contentType: string;
  ext: string;
};

/**
 * Shrinks and compresses a photo in the browser before it is uploaded.
 *
 * Converts to modern WebP (with JPEG fallback), scaling down large phone/camera
 * photos to a max edge of 1400px. This reduces 3–5 MB uploads to ~50–120 KB,
 * ensuring fast loading times without relying on Vercel image optimization.
 */
async function shrink(file: File): Promise<CompressedResult> {
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
    // Try WebP first for superior compression
    canvas.toBlob(
      (webpBlob) => {
        if (webpBlob && webpBlob.type === "image/webp") {
          resolve({ blob: webpBlob, contentType: "image/webp", ext: "webp" });
        } else {
          // Fallback to JPEG if browser does not support WebP canvas export
          canvas.toBlob(
            (jpegBlob) => {
              if (jpegBlob) {
                resolve({
                  blob: jpegBlob,
                  contentType: "image/jpeg",
                  ext: "jpg",
                });
              } else {
                reject(new Error("Could not compress the image."));
              }
            },
            "image/jpeg",
            JPEG_QUALITY,
          );
        }
      },
      "image/webp",
      WEBP_QUALITY,
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
  const { blob, contentType, ext } = await shrink(file);
  const suffix = Math.random().toString(36).slice(2, 8);
  const path = `${slug || "product"}-${suffix}.${ext}`;

  const supabase = createClient();
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, blob, { contentType, upsert: false });

  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
