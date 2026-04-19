"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, Zap, Sparkles, Loader2, ChevronDown } from "lucide-react";
import { apiUrl, saveToken, saveUser } from "@/lib/api-client";
import { getDeviceId } from "@/lib/device-id";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import SiteHeader from "@/components/SiteHeader";

const REGIONS = [
  "서울", "경기", "인천", "부산", "대구", "대전", "광주", "울산", "세종",
  "강원", "충북", "충남", "전북", "전남", "경북", "경남", "제주",
];

export default function SignupPage() {
  const router = useRouter();
  const [showOptional, setShowOptional] = useState(false);
  const [form, setForm] = useState({
    login_id: "",
    password: "",
    name: "",
    email: "",
    phone: "",
    company: "",
    region: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<{ bonus: number } | null>(null);

  const set = (key: string, value: string) =>
    setForm((p) => ({ ...p, [key]: value }));

  const handleSubmit = async () => {
    const { login_id, password, name, email } = form;
    if (!login_id || !password || !name || !email) {
      setError("아이디, 비밀번호, 이름, 이메일은 필수입니다");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const device_id = await getDeviceId();
      const res = await fetch(apiUrl("/api/auth/signup"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, device_id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
        setBusy(false);
        return;
      }
      if (data.token && data.user) {
        saveToken(data.token);
        saveUser(data.user);
      }
      setDone({ bonus: data.bonus ?? 5 });
    } catch {
      setError("서버에 연결할 수 없습니다");
      setBusy(false);
    }
  };

  if (done) {
    return (
      <main className="min-h-[100dvh] bg-neutral-50">
        <SiteHeader />
        <div className="flex items-start justify-center px-6 pt-24 pb-10">
        <div className="w-full max-w-sm bg-white rounded-2xl border border-neutral-200 p-6 text-center">
          <div className="w-14 h-14 rounded-full bg-[#d43e76] flex items-center justify-center mx-auto mb-4">
            <Sparkles size={26} className="text-white" strokeWidth={2} />
          </div>
          <div className="iso-eyebrow mb-3">✓ WELCOME</div>
          <h1 className="iso-display text-[24px] mb-3">
            환영합니다.
          </h1>
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-neutral-900 text-white rounded-full text-[12px] font-bold uppercase tracking-[0.05em] mb-4">
            <Zap size={12} />
            무료 {done.bonus}회 지급 완료
          </div>
          <p className="text-[13px] text-neutral-500 mb-6">
            지금 바로 렌더링을 시작해보세요.
          </p>
          <Button
            onClick={() => router.replace("/")}
            className="w-full h-11 bg-neutral-900 hover:bg-[#d43e76] text-white text-[12px] font-bold uppercase tracking-[0.05em] rounded-lg"
          >
            시작하기 →
          </Button>
        </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[100dvh] bg-neutral-50">
      <SiteHeader />
      <div className="flex items-start justify-center px-6 pt-24 pb-10">
      <div className="w-full max-w-sm">
        {/* Wordmark */}
        <div className="text-center mb-6">
          <div className="flex items-baseline justify-center gap-2 mb-1">
            <span className="text-[21px] font-bold tracking-tight">칸막이Go</span>
            <span className="iso-eyebrow">STUDIO</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-neutral-200 p-5">
          <div className="iso-eyebrow-muted mb-2">CREATE ACCOUNT</div>
          <h1 className="iso-h2 text-[21px] mb-2">회원가입</h1>

          <div className="inline-flex items-center gap-1 mb-6 px-2.5 py-1 bg-neutral-900 text-white rounded-full text-[10px] font-bold uppercase tracking-[0.08em]">
            <Zap size={10} strokeWidth={2.5} />
            가입 즉시 무료 5회 지급
          </div>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="login_id" className="text-[12px] font-semibold">아이디</Label>
              <Input
                id="login_id"
                type="text"
                placeholder="아이디"
                value={form.login_id}
                onChange={(e) => set("login_id", e.target.value)}
                autoComplete="username"
                className="h-10 text-[13px]"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-[12px] font-semibold">비밀번호</Label>
              <Input
                id="password"
                type="password"
                placeholder="비밀번호"
                value={form.password}
                onChange={(e) => set("password", e.target.value)}
                autoComplete="new-password"
                className="h-10 text-[13px]"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-[12px] font-semibold">이름</Label>
              <Input
                id="name"
                type="text"
                placeholder="이름"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                className="h-10 text-[13px]"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-[12px] font-semibold">이메일</Label>
              <Input
                id="email"
                type="email"
                placeholder="email@example.com"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                className="h-10 text-[13px]"
              />
            </div>

            <button
              type="button"
              onClick={() => setShowOptional((v) => !v)}
              className="flex items-center gap-1 text-[11px] text-neutral-500 hover:text-neutral-900"
            >
              <ChevronDown
                size={12}
                className={`transition-transform ${showOptional ? "rotate-180" : ""}`}
              />
              선택 항목 (전화 · 상호 · 지역)
            </button>

            {showOptional && (
              <div className="space-y-3 pt-2">
                <div className="space-y-1.5">
                  <Label htmlFor="phone" className="text-[12px] font-semibold text-neutral-500">전화번호</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="010-0000-0000"
                    value={form.phone}
                    onChange={(e) => set("phone", e.target.value)}
                    className="h-10 text-[13px]"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="company" className="text-[12px] font-semibold text-neutral-500">상호명</Label>
                  <Input
                    id="company"
                    type="text"
                    placeholder="상호명"
                    value={form.company}
                    onChange={(e) => set("company", e.target.value)}
                    className="h-10 text-[13px]"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="region" className="text-[12px] font-semibold text-neutral-500">지역</Label>
                  <select
                    id="region"
                    value={form.region}
                    onChange={(e) => set("region", e.target.value)}
                    className="w-full h-10 px-3 text-[13px] bg-white border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-neutral-900"
                  >
                    <option value="">지역 선택</option>
                    {REGIONS.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {error && (
              <div className="px-3 py-2.5 bg-red-50 border border-red-200 text-red-700 text-[12px] rounded-md">
                {error}
              </div>
            )}

            <Button
              onClick={handleSubmit}
              disabled={busy}
              className="w-full h-11 bg-neutral-900 hover:bg-[#d43e76] text-white text-[12px] font-bold uppercase tracking-[0.05em] rounded-lg"
            >
              {busy ? (
                <>
                  <Loader2 size={14} className="mr-1 animate-spin" />
                  가입 중…
                </>
              ) : (
                <>
                  <UserPlus size={14} className="mr-1" />
                  무료로 시작하기 →
                </>
              )}
            </Button>
          </div>
        </div>

        <div className="text-center mt-5 text-[13px] text-neutral-500">
          이미 계정이 있으신가요?{" "}
          <button
            onClick={() => router.push("/login")}
            className="text-neutral-900 font-bold hover:text-[#d43e76] transition-colors"
          >
            로그인 →
          </button>
        </div>
      </div>
      </div>
    </main>
  );
}
