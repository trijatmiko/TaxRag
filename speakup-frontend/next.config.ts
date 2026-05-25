// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",   // Required untuk Docker image yang minimal
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'ui-avatars.com' },
      {
        protocol: 'http',
        hostname: process.env.NEXT_PUBLIC_MINIO_URL
          ? new URL(process.env.NEXT_PUBLIC_MINIO_URL).hostname
          : 'localhost',
      },
    ],
  },
};

export default nextConfig;