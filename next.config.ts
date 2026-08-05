import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
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
