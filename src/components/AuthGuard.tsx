"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { apiUrl, getToken, clearToken } from "@/lib/api-client";

const PUBLIC_PATHS = ["/login", "/signup"];

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const checkedRef = useRef(false);

  useEffect(() => {
    if (PUBLIC_PATHS.includes(pathname)) return;

    const token = getToken();
    if (!token) {
      router.replace("/login");
      return;
    }

    if (checkedRef.current) return;

    fetch(apiUrl("/api/auth/me"), {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) {
          clearToken();
          router.replace("/login");
        } else {
          checkedRef.current = true;
        }
      })
      .catch(() => {
        clearToken();
        router.replace("/login");
      });
  }, [pathname, router]);

  return <>{children}</>;
}
