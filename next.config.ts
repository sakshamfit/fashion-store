import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Arena's preview is served through HTTPS on a sandbox-specific hostname.
  allowedDevOrigins: ["*.e2b.app", "localhost", "127.0.0.1"],
  devIndicators: false,
};

export default nextConfig;
