"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogIn, Loader2 } from "lucide-react";
import { apiUrl, saveToken, saveUser } from "@/lib/api-client";
import { getDeviceId } from "@/lib/device-id";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import SiteHeader from "@/components/SiteHeader";

export default function LoginPage() {
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
      saveToken(data.token);
      saveUser(data.user);
      router.replace("/");
    } catch {
      setError("서버에 연결할 수 없습니다");
      setBusy(false);
    }
  };

  return (
    <main className="min-h-[100dvh] bg-neutral-50 flex flex-col">
      <SiteHeader />
      <div className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm">
        {/* Wordmark */}
        <div className="text-center mb-8">
          <div className="flex items-baseline justify-center gap-2 mb-1">
            <span className="text-[21px] font-bold tracking-tight">칸막이Go</span>
            <span className="iso-eyebrow">STUDIO</span>
          </div>
          <p className="text-[12px] text-neutral-500">파티션 시공 AI 시뮬레이터</p>
        </div>

        {/* Auth card */}
        <div className="bg-white rounded-2xl border border-neutral-200 p-5">
          <div className="iso-eyebrow-muted mb-2">WELCOME BACK</div>
          <h1 className="iso-h2 text-[21px] mb-6">로그인</h1>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="login_id" className="text-[12px] font-semibold">아이디</Label>
              <Input
                id="login_id"
                type="text"
                placeholder="아이디 입력"
                value={loginId}
                onChange={(e) => setLoginId(e.target.value)}
                autoComplete="username"
                className="h-11 text-[14px]"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-[12px] font-semibold">비밀번호</Label>
              <Input
                id="password"
                type="password"
                placeholder="비밀번호 입력"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                className="h-11 text-[14px]"
              />
            </div>

            {error && (
              <div className="px-3 py-2.5 bg-red-50 border border-red-200 text-red-700 text-[12px] rounded-md">
                {error}
              </div>
            )}

            <Button
              onClick={handleLogin}
              disabled={busy}
              className="w-full h-11 bg-neutral-900 hover:bg-[#d43e76] text-white text-[12px] font-bold uppercase tracking-[0.05em] rounded-lg"
            >
              {busy ? (
                <>
                  <Loader2 size={14} className="mr-1 animate-spin" />
                  로그인 중…
                </>
              ) : (
                <>
                  <LogIn size={14} className="mr-1" />
                  로그인 →
                </>
              )}
            </Button>
          </div>
        </div>

        <div className="text-center mt-5 text-[13px] text-neutral-500">
          계정이 없으신가요?{" "}
          <button
            onClick={() => router.push("/signup")}
            className="text-neutral-900 font-bold hover:text-[#d43e76] transition-colors"
          >
            무료로 시작 →
          </button>
        </div>
      </div>
      </div>
    </main>
  );
}
