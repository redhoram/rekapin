import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Better Auth uses these packages server-side; keep them external so the
  // Neon serverless driver is not bundled into edge/client output.
  serverExternalPackages: ["@neondatabase/serverless"],
};

export default nextConfig;
