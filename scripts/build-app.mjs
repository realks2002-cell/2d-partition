#!/usr/bin/env node
/**
 * Build for Capacitor APK:
 * 1. Temporarily move API routes out of the build tree (static export doesn't allow them)
 * 2. Run `next build` with BUILD_TARGET=app
 * 3. Restore API routes
 */
import { execSync } from "node:child_process";
import { renameSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const apiDir = join(root, "src/app/api");
const apiBackup = join(root, ".api-backup");

const hasApi = existsSync(apiDir);
if (hasApi) {
  console.log("→ Moving API routes aside");
  renameSync(apiDir, apiBackup);
}

let failed = false;
try {
  execSync("next build", {
    cwd: root,
    stdio: "inherit",
    env: {
      ...process.env,
      BUILD_TARGET: "app",
      NEXT_PUBLIC_API_BASE:
        process.env.NEXT_PUBLIC_API_BASE ?? "https://2d-partition.vercel.app",
    },
  });
} catch (e) {
  failed = true;
  console.error("Build failed:", e.message);
} finally {
  if (hasApi && existsSync(apiBackup)) {
    console.log("→ Restoring API routes");
    renameSync(apiBackup, apiDir);
  }
}
process.exit(failed ? 1 : 0);
