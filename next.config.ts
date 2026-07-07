import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Better Auth uses these packages server-side; keep them external so the
  // Neon serverless driver is not bundled into edge/client output.
  serverExternalPackages: ["@neondatabase/serverless"],

  experimental: {
    serverActions: {
      // Upload flow sends files through Server Actions as FormData. The app
      // enforces its own 10 MB cap (MAX_UPLOAD_SIZE_BYTES); 12 MB here leaves
      // headroom for FormData encoding overhead above that cap.
      bodySizeLimit: "12mb",
    },
  },
};

export default nextConfig;
