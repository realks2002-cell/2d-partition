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
          className="inline-flex items-center gap-1 px-2 h-[24px] rounded-md border border-[var(--line-2)] hover:bg-[var(--surface-2)] text-[10px] font-medium"
          title="렌더링 횟수"
        >
          <Zap size={11} className={low ? "text-[var(--danger)]" : "text-[var(--accent)]"} />
          <span className={low ? "text-[var(--danger)]" : ""}>
            {quota === null ? "…" : `${quota}회`}
          </span>
        </button>
        <span className="text-[11px] text-[var(--ink-3)]">{state.user.name}</span>
        {state.user.role === "admin" && (
          <button
            onClick={() => router.push("/admin")}
            className="btn-icon"
            style={{ width: 28, height: 28 }}
            title="관리자"
          >
            <Shield size={13} />
          </button>
        )}
        <button
          onClick={() => { clearToken(); router.push("/login"); }}
          className="btn-icon"
          style={{ width: 28, height: 28 }}
          title="로그아웃"
        >
          <LogOut size={13} />
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => router.push("/login")}
      className="text-[11px] text-[var(--accent)] font-medium underline underline-offset-2"
    >
      로그인
    </button>
  );
}
