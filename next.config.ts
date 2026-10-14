import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // This app lives inside a larger folder that has its own lockfile and PostCSS config;
  // pin the workspace root so Next.js never picks those up.
  turbopack: {
    root: path.resolve(__dirname),
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
