import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  basePath: "/survey",
  serverExternalPackages: ["mysql2"],
};

export default nextConfig;
