import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The e2e suite builds into its own directory so it cannot clobber the .next
  // a running `next dev` is serving from — doing that leaves the dev server
  // without its manifests and every route 500s until it is restarted.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  /**
   * Baseline protective headers. The site handles authentication and takes
   * orders, so these are expected rather than optional.
   *
   * No CSP here yet: getting one right needs the deployed domain and a pass
   * over Supabase, Google Fonts and the Storage host, and a wrong one breaks
   * the site silently. Worth doing at deploy, deliberately, rather than
   * guessing now.
   */
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // Auth cookies over HTTPS only — stops an SSL-strip downgrade on
          // the login flow.
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
          // The login and checkout pages must not be framed for clickjacking.
          { key: "X-Frame-Options", value: "DENY" },
          // Blocks MIME-sniffing on customer-visible uploaded images.
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Keeps full URLs — including any ?next= value — out of third-party
          // referrer logs.
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          // Nothing here uses these, so deny them rather than leave them open.
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
          },
        ],
      },
    ];
  },

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
