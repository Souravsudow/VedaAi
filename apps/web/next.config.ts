import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  allowedDevOrigins: ["127.0.0.1"],
  transpilePackages: ["@vedaai/shared"]
};

export default nextConfig;
