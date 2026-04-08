"use client";

import { useEffect } from "react";
import { useSession } from "./store";

export function useHydrateImages() {
  const hydrateImages = useSession((s) => s.hydrateImages);
  useEffect(() => {
    void hydrateImages();
  }, [hydrateImages]);
}
