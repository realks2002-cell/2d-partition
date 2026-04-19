import type { NextConfig } from "next";

const isAppBuild = process.env.BUILD_TARGET === "app";

const nextConfig: NextConfig = {
  ...(isAppBuild
    ? {
        output: "export",
        images: { unoptimized: true },
        trailingSlash: true,
      }
    : {
        images: {
          remotePatterns: [
            {
              protocol: "https",
              hostname: "*.supabase.co",
              pathname: "/storage/v1/object/public/**",
            },
          ],
        },
      }),
};

export default nextConfig;
