import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["sharp", "pg"],
  outputFileTracingIncludes: {
    "/api/brand/logo": ["./public/brand/**/*", "./src/assets/**/*"],
    "/api/media/[folder]/[file]": ["./public/**/*"],
    "/api/media": ["./public/**/*"],
    "/api/ads": ["./public/ads/**/*"],
    "/api/ads/[slot]": ["./public/ads/**/*"],
  },
  async rewrites() {
    return [
      { source: "/brand/:file", destination: "/api/media/brand/:file" },
      { source: "/avatars/:file", destination: "/api/media/avatars/:file" },
      { source: "/samples/:file", destination: "/api/media/samples/:file" },
    ];
  },
};

export default nextConfig;
