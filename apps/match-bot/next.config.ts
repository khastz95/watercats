import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Keep tracing rooted at the app (monorepo / Vercel rootDirectory).
  outputFileTracingRoot: path.join(__dirname),
};

export default nextConfig;
