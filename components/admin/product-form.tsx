"use client";

import { useActionState, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { uploadProductImage } from "@/lib/images/upload";
import type { AdminProduct } from "@/lib/data/admin";
import type { Category } from "@/lib/types";
import type { ProductFormState } from "@/app/admin/(dashboard)/inventory/actions";

/** Mirrors slugify() in the Server Action, so the preview matches what is saved. */
function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const field =
  "w-full rounded-2xl border-2 border-outline-variant bg-white px-4 py-3 text-body-md text-on-surface focus:border-primary focus:outline-none";
const label =
  "block text-label-caps font-label-caps uppercase tracking-wide text-on-surface-variant mb-1.5";

type Action = (
  state: ProductFormState,
  formData: FormData,
) => Promise<ProductFormState>;

export function ProductForm({
  action,
  categories,
  product,
}: {
  action: Action;
  categories: Category[];
  /** Absent when creating. */
  product?: AdminProduct;
}) {
  const [state, formAction, pending] = useActionState(action, null);

  const [images, setImages] = useState<string[]>(product?.images ?? []);
  const [slug, setSlug] = useState(product?.slug ?? "");
  // "" cannot tell "not typed in yet" from "deliberately cleared", so track it.
  const [slugTouched, setSlugTouched] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploadError(null);
    setUploading(true);
    try {
      const urls: string[] = [];
      for (const file of Array.from(files)) {
        urls.push(await uploadProductImage(file, slug));
      }
      setImages((prev) => [...prev, ...urls]);
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <form action={formAction} className="max-w-2xl space-y-6">
      {product ? <input type="hidden" name="id" value={product.id} /> : null}

      <section className="rounded-[2rem] border-2 border-candy-pink/30 bg-surface-container-lowest p-6 space-y-5">
        <div>
          <label className={label} htmlFor="name">
            Name
          </label>
          <input
            id="name"
            name="name"
            required
            defaultValue={product?.name}
            className={field}
            onChange={(e) => {
              // Auto-fill the address from the name while creating, and only
              // until the field is touched. Never when editing: changing a
              // listed piece's address silently breaks every link already
              // shared for it.
              if (product || slugTouched) return;
              setSlug(slugify(e.target.value));
            }}
          />
        </div>

        <div>
          <label className={label} htmlFor="slug">
            Web address
          </label>
          <input
            id="slug"
            name="slug"
            value={slug}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(e.target.value);
            }}
            placeholder="left blank, this is made from the name"
            className={field}
          />
          <p className="text-[13px] text-on-surface-variant mt-1.5">
            /shop → {slug || "auto-generated"}. Changing it on a listed piece
            breaks any link already shared.
          </p>
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <label className={label} htmlFor="price_rupees">
              Price (₹)
            </label>
            <input
              id="price_rupees"
              name="price_rupees"
              type="number"
              min="0"
              step="1"
              required
              defaultValue={product ? product.priceCents / 100 : ""}
              className={field}
            />
          </div>
          <div>
            <label className={label} htmlFor="stock_count">
              Stock
            </label>
            <input
              id="stock_count"
              name="stock_count"
              type="number"
              min="0"
              step="1"
              required
              defaultValue={product?.stockCount ?? 0}
              className={field}
            />
          </div>
          <div>
            <label className={label} htmlFor="category_id">
              Category
            </label>
            <select
              id="category_id"
              name="category_id"
              defaultValue={product?.categoryId ?? ""}
              className={field}
            >
              <option value="">— none —</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <section className="rounded-[2rem] border-2 border-candy-pink/30 bg-surface-container-lowest p-6 space-y-5">
        <div>
          <label className={label} htmlFor="description">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            rows={4}
            defaultValue={product?.description}
            className={field}
          />
        </div>
        <div>
          <label className={label} htmlFor="artisan_note">
            Artisan note
          </label>
          <textarea
            id="artisan_note"
            name="artisan_note"
            rows={3}
            defaultValue={product?.artisanNote}
            className={field}
          />
        </div>
      </section>

      <section className="rounded-[2rem] border-2 border-candy-pink/30 bg-surface-container-lowest p-6">
        <span className={label}>Photos</span>

        {images.length > 0 && (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mb-4">
            {images.map((url, i) => (
              <div key={url} className="relative group">
                <div className="relative aspect-square rounded-2xl overflow-hidden border-2 border-outline-variant bg-surface-container-high">
                  <Image src={url} alt="" fill sizes="128px" className="object-cover" />
                </div>
                {i === 0 && (
                  <span className="absolute top-1 left-1 rounded-full bg-primary text-on-primary text-[10px] px-2 py-0.5">
                    Main
                  </span>
                )}
                <button
                  type="button"
                  aria-label="Remove photo"
                  onClick={() => setImages((p) => p.filter((u) => u !== url))}
                  className="absolute -top-2 -right-2 bg-error text-on-error rounded-full w-6 h-6 flex items-center justify-center shadow"
                >
                  <Icon name="close" className="text-[16px]" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Each URL rides along as its own field, so `images` arrives as an array. */}
        {images.map((url) => (
          <input key={url} type="hidden" name="images" value={url} />
        ))}

        <label className="inline-flex items-center gap-2 rounded-2xl border-2 border-dashed border-outline-variant px-4 py-3 cursor-pointer hover:border-primary transition-colors text-body-md text-on-surface-variant">
          <Icon name="add_photo_alternate" />
          {uploading ? "Uploading…" : "Add photos"}
          <input
            type="file"
            accept="image/*"
            multiple
            disabled={uploading}
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
        </label>
        <p className="text-[13px] text-on-surface-variant mt-2">
          Resized to 1600px before uploading, so a 4 MB phone photo becomes a
          few hundred KB. The first photo is the one shown on cards.
        </p>
        {uploadError && (
          <p className="text-body-md text-error mt-2" role="alert">
            {uploadError}
          </p>
        )}
      </section>

      <section className="rounded-[2rem] border-2 border-candy-pink/30 bg-surface-container-lowest p-6 space-y-3">
        <label className="flex items-center gap-3 text-body-md text-on-surface">
          <input
            type="checkbox"
            name="is_active"
            defaultChecked={product ? product.isActive : true}
            className="w-5 h-5 accent-[#864d61]"
          />
          Listed in the shop
        </label>
        <label className="flex items-center gap-3 text-body-md text-on-surface">
          <input
            type="checkbox"
            name="is_best_seller"
            defaultChecked={product?.isBestSeller}
            className="w-5 h-5 accent-[#864d61]"
          />
          Featured — shows in the Best Sellers row
        </label>
        <label className="flex items-center gap-3 text-body-md text-on-surface">
          <input
            type="checkbox"
            name="is_new_arrival"
            defaultChecked={product?.isNewArrival}
            className="w-5 h-5 accent-[#864d61]"
          />
          New arrival
        </label>
      </section>

      {state?.error && (
        <p
          className="text-body-md text-error bg-error-container/50 rounded-2xl px-4 py-3"
          role="alert"
        >
          {state.error}
        </p>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending || uploading}
          className="tactile-button rounded-2xl bg-primary text-on-primary font-headline-md px-6 py-3 text-body-lg disabled:opacity-60"
        >
          {pending ? "Saving…" : product ? "Save changes" : "Add piece"}
        </button>
        <Link
          href="/admin/inventory"
          className="text-primary font-label-caps text-label-caps uppercase tracking-wider hover:underline"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
