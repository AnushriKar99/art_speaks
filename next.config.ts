import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Mock product imagery is currently hosted on Google usercontent (from the
    // Stitch design export). When the Supabase Storage backend lands, add its
    // host here and drop these.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
    ],
  },
};

export default nextConfig;
