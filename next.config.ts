import type { NextConfig } from "next";

const isAppBuild = process.env.BUILD_TARGET === "app";

const nextConfig: NextConfig = {
  ...(isAppBuild
    ? {
        output: "export",
        images: { unoptimized: true },
        trailingSlash: true,
      }
    : {}),
};

export default nextConfig;
