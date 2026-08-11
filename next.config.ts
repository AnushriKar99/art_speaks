import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The e2e suite builds into its own directory so it cannot clobber the .next
  // a running `next dev` is serving from — doing that leaves the dev server
  // without its manifests and every route 500s until it is restarted.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  images: {
    // Next generates one variant per width in these lists, and re-downloads
    // the full original for each one — so every width you don't need is a
    // wasted multi-megabyte fetch from Supabase.
    //
    // The defaults run to 3840px, sized for full-bleed hero images on 4K
    // displays. Nothing here is bigger than a product modal, so those variants
    // would never be requested and only cost egress on a cache rebuild.
    //
    // Chosen to cover the `sizes` props actually in use, at 1x and 2x DPR:
    //   64px  (cart thumb) · 200/220/260px (cards) · 340px (reviews)
    //   24rem, 33vw, 42rem, 50vw, 100vw
    deviceSizes: [640, 828, 1080, 1920],
    imageSizes: [64, 128, 256, 384],
    remotePatterns: [
      // Product images uploaded through the admin panel. Public bucket, so
      // the path is stable and needs no signing.
      {
        protocol: "https",
        hostname: "udflrtaipqzbsfhtzuue.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      // Legacy mock imagery from the Stitch design export. Drop this once
      // every product has a real uploaded image (Phase 3).
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
    ],
  },
};

export default nextConfig;
