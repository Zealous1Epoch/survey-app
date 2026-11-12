import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  basePath: "/survey",
  serverExternalPackages: ["mysql2"],
  // home 目录存在无关 lockfile，显式锚定工作区根，避免 trace 误判
  outputFileTracingRoot: path.join(__dirname),
};

export default nextConfig;
