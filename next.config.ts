import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [];
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
};

export default nextConfig;
