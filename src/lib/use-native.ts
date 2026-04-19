"use client";

import { useSyncExternalStore } from "react";
import { isNative } from "@/lib/native-io";

const subscribe = () => () => {};

export function useNative(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => isNative(),
    () => false,
  );
}
