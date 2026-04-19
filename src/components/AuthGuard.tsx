"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { apiUrl, getToken, getUser, clearToken } from "@/lib/api-client";

const PUBLIC_PATHS = ["/", "/login", "/signup", "/how-to", "/pricing", "/admin/login", "/privacy", "/terms"];

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const checkedRef = useRef(false);

  useEffect(() => {
    if (PUBLIC_PATHS.includes(pathname)) return;

    const isAdminArea = pathname.startsWith("/admin");
    const token = getToken();

    if (!token) {
      router.replace(isAdminArea ? "/admin/login" : "/login");
      return;
    }

    // /admin/* 에서는 관리자 권한 요구
    if (isAdminArea) {
      const u = getUser();
      if (!u || u.role !== "admin") {
        router.replace("/admin/login");
        return;
      }
    }

    if (checkedRef.current) return;

    fetch(apiUrl("/api/auth/me"), {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) {
          clearToken();
          router.replace(isAdminArea ? "/admin/login" : "/login");
        } else {
          checkedRef.current = true;
        }
      })
      .catch(() => {
        clearToken();
        router.replace(isAdminArea ? "/admin/login" : "/login");
      });
  }, [pathname, router]);

  return <>{children}</>;
}
