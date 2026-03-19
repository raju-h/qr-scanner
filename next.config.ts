import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Allow mobile devices on the local network to access the dev server
  // without triggering cross-origin warnings for HMR websocket
  allowedDevOrigins: ["192.168.1.107"],
};

export default nextConfig;
