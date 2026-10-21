import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // cacheComponents is intentionally OFF: every page here depends on the
  // session cookie (dynamic by nature) and Cache Components would force a
  // Suspense boundary around every cookies() read.
  poweredByHeader: false,
  // self-contained server bundle for the Docker image (see Dockerfile)
  output: "standalone",
  // Uploaded images live in the Go API; expose them on the site origin.
  async rewrites() {
    const api = (process.env.API_URL || "http://127.0.0.1:8080").replace(/\/+$/, "");
    return [{ source: "/uploads/:path*", destination: `${api}/api/uploads/:path*` }];
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
