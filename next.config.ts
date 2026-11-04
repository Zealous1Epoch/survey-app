import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  serverExternalPackages: ["better-sqlite3"],
  allowedDevOrigins: [".trycloudflare.com"],
  outputFileTracingRoot: path.join(__dirname),
};

export default nextConfig;
