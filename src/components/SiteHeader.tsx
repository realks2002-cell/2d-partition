"use client";

import { useEffect, useState, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { LogOut, Shield, Zap, Menu, X, BookOpen } from "lucide-react";
import {
  getUser,
  getToken,
  clearToken,
  apiUrl,
  authHeaders,
} from "@/lib/api-client";
import { useNative } from "@/lib/use-native";
import QuotaExhaustedModal from "@/components/QuotaExhaustedModal";

interface Props {
  variant?: "default" | "transparent";
}

export default function SiteHeader({ variant = "default" }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [state, setState] = useState<{ user: ReturnType<typeof getUser>; loggedIn: boolean } | null>(
    () => (typeof window === "undefined" ? null : { user: getUser(), loggedIn: !!getToken() }),
  );
  const [quota, setQuota] = useState<number | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [quotaModalOpen, setQuotaModalOpen] = useState(false);
  const native = useNative();

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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (getToken()) fetchQuota();

    const onFocus = () => { if (getToken()) fetchQuota(); };
    const onQuota = () => fetchQuota();
    const onStorage = () => setState({ user: getUser(), loggedIn: !!getToken() });
    window.addEventListener("focus", onFocus);
    window.addEventListener("quota-changed", onQuota);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("quota-changed", onQuota);
      window.removeEventListener("storage", onStorage);
    };
  }, [fetchQuota]);

  const logout = () => {
    clearToken();
    router.push("/login");
  };

  const isActive = (href: string) => pathname === href;

  const bgCls = variant === "transparent" ? "bg-white/90 backdrop-blur" : "bg-white";

  return (
    <header className={`sticky top-0 z-50 ${bgCls} border-b border-neutral-200`}>
      <div className="mx-auto px-6 h-16 flex items-center justify-between" style={{ maxWidth: 864 }}>
        {/* Wordmark */}
        <Link href="/" className="flex items-baseline gap-2 shrink-0">
          <span className="text-[22px] font-bold tracking-tight text-neutral-900">칸막이Go</span>
          <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#d43e76]">
            STUDIO
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-7">
          <Link
            href="/how-to"
            className={`text-[13px] font-semibold transition-colors ${
              isActive("/how-to") ? "text-[#d43e76]" : "text-neutral-700 hover:text-[#d43e76]"
            }`}
          >
            사용법
          </Link>
          {!native && (
            <Link
              href="/pricing"
              className={`text-[13px] font-semibold transition-colors ${
                isActive("/pricing") ? "text-[#d43e76]" : "text-neutral-700 hover:text-[#d43e76]"
              }`}
            >
              요금제
            </Link>
          )}
          {state?.loggedIn && (
            <>
              <Link
                href="/studio"
                className={`text-[13px] font-semibold transition-colors ${
                  isActive("/studio") ? "text-[#d43e76]" : "text-neutral-700 hover:text-[#d43e76]"
                }`}
              >
                Studio
              </Link>
              {!native && (
                <Link
                  href="/billing"
                  className={`text-[13px] font-semibold transition-colors ${
                    isActive("/billing") ? "text-[#d43e76]" : "text-neutral-700 hover:text-[#d43e76]"
                  }`}
                >
                  내역
                </Link>
              )}
            </>
          )}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {state === null ? null : state.loggedIn && state.user ? (
            <>
              <button
                onClick={() => native ? setQuotaModalOpen(true) : router.push("/pricing")}
                className={`inline-flex items-center gap-1.5 px-3 h-9 rounded-full border text-[12px] font-bold transition-colors ${
                  quota !== null && quota <= 3
                    ? "border-red-300 bg-red-50 text-red-700 hover:bg-red-100"
                    : native
                      ? "border-neutral-300 bg-white text-neutral-900 hover:border-neutral-900"
                      : "border-neutral-300 bg-white text-neutral-900 hover:border-neutral-900 hover:text-[#d43e76]"
                }`}
                title={native ? "남은 렌더링 횟수" : "렌더링 횟수 충전"}
              >
                <Zap
                  size={12}
                  className={
                    quota !== null && quota <= 3
                      ? "text-red-500"
                      : native
                        ? "text-neutral-500"
                        : "text-[#d43e76]"
                  }
                  strokeWidth={2.5}
                />
                <span>{quota === null ? "…" : `${quota}회`}</span>
              </button>
              <div className="hidden sm:flex items-center gap-2">
                <span className="text-[12px] text-neutral-700 font-medium">{state.user.name}</span>
                {state.user.role === "admin" && (
                  <button
                    onClick={() => router.push("/admin")}
                    className="w-8 h-8 rounded-full border border-neutral-300 hover:border-neutral-900 hover:text-[#d43e76] flex items-center justify-center transition-colors"
                    title="관리자"
                  >
                    <Shield size={13} />
                  </button>
                )}
                <button
                  onClick={logout}
                  className="w-8 h-8 rounded-full border border-neutral-300 hover:border-neutral-900 hover:text-[#d43e76] flex items-center justify-center transition-colors"
                  title="로그아웃"
                >
                  <LogOut size={13} />
                </button>
              </div>
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="md:hidden w-9 h-9 rounded-full border border-neutral-300 hover:border-neutral-900 flex items-center justify-center"
                aria-label="메뉴"
              >
                {menuOpen ? <X size={15} /> : <Menu size={15} />}
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="hidden sm:inline-flex items-center h-9 px-3 text-[12px] font-bold text-neutral-900 hover:text-[#d43e76] transition-colors"
              >
                로그인
              </Link>
              <Link
                href="/signup"
                className="hidden sm:inline-flex items-center gap-1 h-9 px-4 bg-neutral-900 hover:bg-[#d43e76] text-white rounded-md text-[12px] font-bold uppercase tracking-[0.05em] transition-colors"
              >
                무료 시작 →
              </Link>
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="sm:hidden w-9 h-9 rounded-full border border-neutral-300 hover:border-neutral-900 flex items-center justify-center"
                aria-label="메뉴"
              >
                {menuOpen ? <X size={15} /> : <Menu size={15} />}
              </button>
            </>
          )}
        </div>
      </div>

      <QuotaExhaustedModal
        open={quotaModalOpen}
        onClose={() => setQuotaModalOpen(false)}
        remaining={quota ?? 0}
        required={1}
      />

      {/* Mobile menu drawer */}
      {menuOpen && (
        <div className="md:hidden border-t border-neutral-200 bg-white">
          <div className="mx-auto px-6 py-3 flex flex-col gap-1" style={{ maxWidth: 864 }}>
            <Link
              href="/how-to"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-2 py-2.5 text-[13px] font-semibold text-neutral-700 hover:text-[#d43e76]"
            >
              <BookOpen size={14} /> 사용법
            </Link>
            {!native && (
              <Link
                href="/pricing"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2 py-2.5 text-[13px] font-semibold text-neutral-700 hover:text-[#d43e76]"
              >
                <Zap size={14} /> 요금제
              </Link>
            )}
            {state?.loggedIn ? (
              <>
                {!native && (
                  <Link
                    href="/billing"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2 py-2.5 text-[13px] font-semibold text-neutral-700 hover:text-[#d43e76]"
                  >
                    내역
                  </Link>
                )}
                {state.user?.role === "admin" && (
                  <Link
                    href="/admin"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2 py-2.5 text-[13px] font-semibold text-neutral-700 hover:text-[#d43e76]"
                  >
                    <Shield size={14} /> 관리자
                  </Link>
                )}
                <button
                  onClick={() => { setMenuOpen(false); logout(); }}
                  className="flex items-center gap-2 py-2.5 text-[13px] font-semibold text-neutral-700 hover:text-[#d43e76] text-left"
                >
                  <LogOut size={14} /> 로그아웃
                </button>
              </>
            ) : (
              <div className="flex gap-2 pt-2 border-t border-neutral-200 mt-2">
                <Link
                  href="/login"
                  onClick={() => setMenuOpen(false)}
                  className="flex-1 inline-flex items-center justify-center h-10 border border-neutral-300 hover:border-neutral-900 rounded-md text-[12px] font-bold"
                >
                  로그인
                </Link>
                <Link
                  href="/signup"
                  onClick={() => setMenuOpen(false)}
                  className="flex-1 inline-flex items-center justify-center h-10 bg-neutral-900 hover:bg-[#d43e76] text-white rounded-md text-[12px] font-bold uppercase tracking-[0.05em]"
                >
                  무료 시작 →
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
