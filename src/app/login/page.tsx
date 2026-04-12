"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogIn } from "lucide-react";
import { apiUrl, saveToken, saveUser } from "@/lib/api-client";
import { getDeviceId } from "@/lib/device-id";

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
    <main className="h-[100dvh] max-w-md mx-auto flex flex-col px-6 pt-safe pb-safe">
      <section className="pt-16 pb-8 rise rise-1">
        <div className="eyebrow mb-3">Partition Visualizer</div>
        <h1 className="display-tight text-[22px] mb-2">로그인</h1>
        <p className="text-[13px] leading-[1.55] text-[var(--ink-3)]">
          계정으로 로그인하세요.
        </p>
      </section>

      <section className="flex flex-col gap-4 rise rise-2">
        <div className="field">
          <label className="field-label">아이디</label>
          <input
            type="text"
            className="text-input"
            placeholder="아이디 입력"
            value={loginId}
            onChange={(e) => setLoginId(e.target.value)}
            autoComplete="username"
          />
        </div>

        <div className="field">
          <label className="field-label">비밀번호</label>
          <input
            type="password"
            className="text-input"
            placeholder="비밀번호 입력"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
          />
        </div>

        {error && (
          <p className="text-[13px] text-[var(--danger)] text-center">
            {error}
          </p>
        )}

        <button
          onClick={handleLogin}
          disabled={busy}
          className="btn btn-primary w-full mt-2"
        >
          <LogIn size={18} />
          {busy ? "로그인 중…" : "로그인"}
        </button>
      </section>

      <div className="mt-6 text-center rise rise-3">
        <p className="text-[13px] text-[var(--muted)]">
          계정이 없으신가요?{" "}
          <button
            onClick={() => router.push("/signup")}
            className="text-[var(--ink)] font-medium underline underline-offset-2"
          >
            회원가입
          </button>
        </p>
      </div>
    </main>
  );
}
