"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Shield, Zap } from "lucide-react";
import { getUser, getToken, clearToken, apiUrl, authHeaders } from "@/lib/api-client";

export default function UserStatus() {
  const router = useRouter();
  const [state, setState] = useState<{ user: ReturnType<typeof getUser>; loggedIn: boolean } | null>(null);
  const [quota, setQuota] = useState<number | null>(null);

  const fetchQuota = useCallback(async () => {
    try {
      const res = await fetch(apiUrl("/api/me/quota"), { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        setQuota(data.quota);
      }
    } catch {}
  }, []);

  useEffect(() => {
    setState({ user: getUser(), loggedIn: !!getToken() });
    if (getToken()) fetchQuota();

    const onFocus = () => { if (getToken()) fetchQuota(); };
    const onQuota = () => fetchQuota();
    window.addEventListener("focus", onFocus);
    window.addEventListener("quota-changed", onQuota);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("quota-changed", onQuota);
    };
  }, [fetchQuota]);

  if (!state) return null;

  if (state.loggedIn && state.user) {
    const low = quota !== null && quota <= 3;
    return (
      <div className="flex items-center gap-2">
        <button
          onClick={() => router.push("/pricing")}
          className={`inline-flex items-center gap-1.5 px-2.5 h-[26px] rounded-full border text-[11px] font-semibold transition-colors ${
            low
              ? "border-red-300 bg-red-50 text-red-700 hover:bg-red-100"
              : "border-neutral-300 bg-white text-neutral-900 hover:border-neutral-900 hover:text-[#d43e76]"
          }`}
          title="렌더링 횟수"
        >
          <Zap size={11} className={low ? "text-red-500" : "text-[#d43e76]"} strokeWidth={2.5} />
          <span>{quota === null ? "…" : `${quota}회`}</span>
        </button>
        <span className="text-[12px] text-neutral-600 font-medium">{state.user.name}</span>
        {state.user.role === "admin" && (
          <button
            onClick={() => router.push("/admin")}
            className="w-7 h-7 rounded-full border border-neutral-300 hover:border-neutral-900 hover:text-[#d43e76] flex items-center justify-center transition-colors"
            title="관리자"
          >
            <Shield size={12} />
          </button>
        )}
        <button
          onClick={() => { clearToken(); router.push("/login"); }}
          className="w-7 h-7 rounded-full border border-neutral-300 hover:border-neutral-900 hover:text-[#d43e76] flex items-center justify-center transition-colors"
          title="로그아웃"
        >
          <LogOut size={12} />
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => router.push("/login")}
      className="text-[12px] font-bold uppercase tracking-[0.05em] text-neutral-900 hover:text-[#d43e76]"
    >
      로그인
    </button>
  );
}
