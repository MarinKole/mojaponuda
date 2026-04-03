import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Empty turbopack config to silence webpack warning
  // Turbopack doesn't need canvas alias since it handles it differently
  turbopack: {},
  
  webpack: (config, { isServer }) => {
    // Ignore canvas dependency for pdfjs-dist in serverless environment
    // This is for webpack builds (if explicitly using --webpack flag)
    if (isServer) {
      config.resolve = config.resolve || {};
      config.resolve.alias = {
        ...config.resolve.alias,
        canvas: false,
      };
    }
    return config;
  },
};

export default nextConfig;
