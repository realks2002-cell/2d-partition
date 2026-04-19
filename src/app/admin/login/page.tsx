"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Shield, Loader2, ArrowLeft } from "lucide-react";
import { apiUrl, saveToken, saveUser } from "@/lib/api-client";
import { getDeviceId } from "@/lib/device-id";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function AdminLoginPage() {
  const router = useRouter();
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async () => {
    if (!loginId || !password) {
      setError("아이디와 비밀번호를 입력해주세요");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const deviceId = await getDeviceId();
      const res = await fetch(apiUrl("/api/auth/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          login_id: loginId,
          password,
          device_id: deviceId,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
        setBusy(false);
        return;
      }

      // 관리자 권한 검증
      if (data.user?.role !== "admin") {
        setError("관리자 권한이 없는 계정입니다");
        setBusy(false);
        return;
      }

      saveToken(data.token);
      saveUser(data.user);
      router.replace("/admin");
    } catch {
      setError("서버에 연결할 수 없습니다");
      setBusy(false);
    }
  };

  return (
    <main className="min-h-[100dvh] bg-neutral-900 text-white flex flex-col items-center justify-center px-6 pt-safe pb-safe">
      {/* 좌상단 홈 이동 (숨김용, 일반 사용자 안내) */}
      <Link
        href="/"
        className="absolute top-6 left-6 inline-flex items-center gap-1.5 text-[12px] text-neutral-500 hover:text-white transition-colors"
      >
        <ArrowLeft size={14} /> 메인으로
      </Link>

      <div className="w-full max-w-sm">
        {/* Admin badge */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 border border-[#d43e76] text-[#d43e76] rounded-full mb-6">
            <Shield size={13} strokeWidth={2.5} />
            <span className="text-[11px] font-bold uppercase tracking-[0.2em]">
              Admin · Restricted
            </span>
          </div>
          <div className="flex items-baseline justify-center gap-2 mb-2">
            <span className="text-[26px] font-bold tracking-tight">칸막이Go</span>
            <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#d43e76]">
              CONTROL
            </span>
          </div>
          <p className="text-[12px] text-neutral-400">관리자 전용 접근</p>
        </div>

        {/* Login card (dark variant) */}
        <div className="bg-neutral-800 border border-neutral-700 rounded-2xl p-6">
          <div className="iso-eyebrow-muted mb-2" style={{ color: "#737373" }}>
            ADMIN SIGN IN
          </div>
          <h1 className="text-[21px] font-bold tracking-tight mb-6 text-white">
            관리자 로그인
          </h1>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label
                htmlFor="admin_login_id"
                className="text-[11px] font-semibold text-neutral-400"
              >
                관리자 아이디
              </Label>
              <Input
                id="admin_login_id"
                type="text"
                placeholder="admin"
                value={loginId}
                onChange={(e) => setLoginId(e.target.value)}
                autoComplete="username"
                className="h-11 text-[14px] bg-neutral-900 border-neutral-700 text-white placeholder:text-neutral-600 focus:border-[#d43e76] focus:ring-[#d43e76]/30"
              />
            </div>
            <div className="space-y-1.5">
              <Label
                htmlFor="admin_password"
                className="text-[11px] font-semibold text-neutral-400"
              >
                비밀번호
              </Label>
              <Input
                id="admin_password"
                type="password"
                placeholder="비밀번호"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                className="h-11 text-[14px] bg-neutral-900 border-neutral-700 text-white placeholder:text-neutral-600 focus:border-[#d43e76] focus:ring-[#d43e76]/30"
              />
            </div>

            {error && (
              <div className="px-3 py-2.5 bg-red-900/30 border border-red-800 text-red-300 text-[12px] rounded-md">
                {error}
              </div>
            )}

            <Button
              onClick={handleLogin}
              disabled={busy}
              className="w-full h-11 bg-[#d43e76] hover:bg-[#b93366] text-white text-[12px] font-bold uppercase tracking-[0.05em] rounded-lg"
            >
              {busy ? (
                <>
                  <Loader2 size={14} className="mr-1 animate-spin" />
                  인증 중…
                </>
              ) : (
                <>
                  <Shield size={14} className="mr-1" />
                  관리자 로그인 →
                </>
              )}
            </Button>
          </div>
        </div>

        <div className="text-center mt-6 text-[11px] text-neutral-500">
          <p>이 페이지는 관리자 전용입니다.</p>
          <p className="mt-1">일반 회원은{" "}
            <Link
              href="/login"
              className="text-[#d43e76] font-bold hover:underline"
            >
              회원 로그인
            </Link>
            을 이용해주세요.
          </p>
        </div>
      </div>
    </main>
  );
}
