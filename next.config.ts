import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The e2e suite builds into its own directory so it cannot clobber the .next
  // a running `next dev` is serving from — doing that leaves the dev server
  // without its manifests and every route 500s until it is restarted.
  distDir: process.env.NEXT_DIST_DIR || ".next",

  /**
   * Hosts allowed to load dev resources. **Development only** — this has no
   * effect on a production build.
   *
   * Next blocks cross-origin requests to /_next/* in dev by default. Opening
   * the dev server from a phone means reaching it by LAN address rather than
   * localhost, which counts as cross-origin: the HTML renders, hydration never
   * completes, and every button silently does nothing. No error appears in the
   * browser — the only clue is a warning in the terminal.
   *
   * DEV_ORIGIN lets a changed LAN address be passed in without editing this
   * file: `DEV_ORIGIN=192.168.1.42 npm run dev`. Find yours with
   * `ipconfig getifaddr en0`.
   */
  allowedDevOrigins: [
    ...(process.env.DEV_ORIGIN ? [process.env.DEV_ORIGIN] : []),
    "172.16.2.213",
  ],
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
    // Serve images directly from Supabase Storage rather than routing through
    // Vercel's Image Optimization proxy. This prevents hitting Vercel's monthly
    // image optimization quota limits.
    unoptimized: true,
    remotePatterns: [
      // Product images uploaded through the admin panel. Public bucket, so
      // the path is stable and needs no signing.
      {
        protocol: "https",
        hostname: "udflrtaipqzbsfhtzuue.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
