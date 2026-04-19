"use client";

import { useEffect } from "react";
import { initAppUrlListener } from "@/lib/app-bridge";

export default function AppBridgeInit() {
  useEffect(() => {
    const dispose = initAppUrlListener();
    return dispose;
  }, []);
  return null;
}
