"use client";

import { Capacitor } from "@capacitor/core";
import { Device } from "@capacitor/device";

export async function getDeviceId(): Promise<string> {
  if (Capacitor.isNativePlatform()) {
    const info = await Device.getId();
    return info.identifier;
  }
  let id = localStorage.getItem("device_id");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("device_id", id);
  }
  return id;
}
