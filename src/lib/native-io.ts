"use client";

import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";

export const isNative = () => Capacitor.isNativePlatform();

function dataUrlToBase64(dataUrl: string): { base64: string; mime: string } {
  const [meta, b64] = dataUrl.split(",");
  const mime = meta.match(/data:(.*?);/)?.[1] ?? "image/png";
  return { base64: b64 ?? "", mime };
}

/**
 * Save image to device. On native, writes directly to the Documents/Hwadam
 * folder (no share sheet). On web, triggers a browser download.
 * Returns the file URI.
 */
export async function saveImage(dataUrl: string, filename: string) {
  if (isNative()) {
    const { base64 } = dataUrlToBase64(dataUrl);
    const result = await Filesystem.writeFile({
      path: `Hwadam/${filename}`,
      data: base64,
      directory: Directory.Documents,
      recursive: true,
    });
    return result.uri;
  }
  // Web fallback
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  a.click();
  return filename;
}

/**
 * Share image via native share sheet (native) or Web Share API (web).
 * Falls back to download if not supported.
 */
export async function shareImage(
  dataUrl: string,
  filename: string,
  title: string,
) {
  if (isNative()) {
    // Write to cache then share
    const { base64 } = dataUrlToBase64(dataUrl);
    const result = await Filesystem.writeFile({
      path: filename,
      data: base64,
      directory: Directory.Cache,
      recursive: true,
    });
    await Share.share({
      title,
      text: title,
      url: result.uri,
      dialogTitle: "공유",
    });
    return;
  }
  // Web
  if (typeof navigator !== "undefined" && "share" in navigator) {
    try {
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], filename, { type: blob.type });
      await navigator.share({ title, text: title, files: [file] });
      return;
    } catch {
      // fall through to download
    }
  }
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  a.click();
}
