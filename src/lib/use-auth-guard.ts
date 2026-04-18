"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getToken, clearToken } from "./api-client";

export function useAuthGuard() {
  const router = useRouter();

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.replace("/login");
    }
  }, [router]);
}
