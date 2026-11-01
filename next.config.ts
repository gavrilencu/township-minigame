import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lets a phone on the same Wi-Fi open the dev server (e.g. http://192.168.1.10:3000).
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*"],
  cacheComponents: true,
  partialPrefetching: true,
  // The service worker must never be served stale, or updates would not reach installed apps.
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
