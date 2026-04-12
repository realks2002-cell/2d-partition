"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { apiUrl, getToken, clearToken } from "@/lib/api-client";

const PUBLIC_PATHS = ["/login", "/signup"];

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (PUBLIC_PATHS.includes(pathname)) {
      setChecked(true);
      return;
    }

    const token = getToken();
    if (!token) {
      router.replace("/login");
      return;
    }

    fetch(apiUrl("/api/auth/me"), {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) {
          clearToken();
          router.replace("/login");
        } else {
          setChecked(true);
        }
      })
      .catch(() => {
        clearToken();
        router.replace("/login");
      });
  }, [pathname, router]);

  if (!checked && !PUBLIC_PATHS.includes(pathname)) {
    return (
      <div className="h-[100dvh] flex items-center justify-center">
        <div className="text-[var(--muted)] text-[14px]">확인 중…</div>
      </div>
    );
  }

  return <>{children}</>;
}
