"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus } from "lucide-react";
import { apiUrl } from "@/lib/api-client";

const REGIONS = [
  "서울", "경기", "인천", "부산", "대구", "대전", "광주", "울산", "세종",
  "강원", "충북", "충남", "전북", "전남", "경북", "경남", "제주",
];

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    login_id: "",
    password: "",
    name: "",
    phone: "",
    email: "",
    company: "",
    region: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const set = (key: string, value: string) =>
    setForm((p) => ({ ...p, [key]: value }));

  const handleSubmit = async () => {
    const { login_id, password, name, phone, email, region } = form;
    if (!login_id || !password || !name || !phone || !email || !region) {
      setError("필수 항목을 모두 입력해주세요");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await fetch(apiUrl("/api/auth/signup"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
        setBusy(false);
        return;
      }
      setDone(true);
    } catch {
      setError("서버에 연결할 수 없습니다");
      setBusy(false);
    }
  };

  if (done) {
    return (
      <main className="h-[100dvh] max-w-md mx-auto flex flex-col items-center justify-center px-6 pt-safe pb-safe">
        <div className="text-center rise">
          <div className="w-16 h-16 rounded-full bg-[var(--success)] text-white flex items-center justify-center mx-auto mb-4">
            <UserPlus size={28} />
          </div>
          <h1 className="display text-[20px] mb-2">가입 완료</h1>
          <p className="text-[14px] text-[var(--ink-3)] mb-6">
            관리자 승인 후 로그인할 수 있습니다.
          </p>
          <button
            onClick={() => router.replace("/login")}
            className="btn btn-primary"
          >
            로그인 화면으로
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[100dvh] max-w-md mx-auto flex flex-col px-6 pt-safe pb-safe">
      <section className="pt-10 pb-4 rise rise-1">
        <div className="eyebrow mb-3">Create Account</div>
        <h1 className="display-tight text-[22px] mb-1">회원가입</h1>
      </section>

      <section className="flex flex-col gap-3 rise rise-2 pb-8">
        <div className="field">
          <label className="field-label">아이디 *</label>
          <input
            type="text"
            className="text-input"
            placeholder="아이디"
            value={form.login_id}
            onChange={(e) => set("login_id", e.target.value)}
            autoComplete="username"
          />
        </div>

        <div className="field">
          <label className="field-label">비밀번호 *</label>
          <input
            type="password"
            className="text-input"
            placeholder="비밀번호"
            value={form.password}
            onChange={(e) => set("password", e.target.value)}
            autoComplete="new-password"
          />
        </div>

        <div className="field">
          <label className="field-label">이름 *</label>
          <input
            type="text"
            className="text-input"
            placeholder="이름"
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
          />
        </div>

        <div className="field">
          <label className="field-label">전화번호 *</label>
          <input
            type="tel"
            className="text-input"
            placeholder="010-0000-0000"
            value={form.phone}
            onChange={(e) => set("phone", e.target.value)}
          />
        </div>

        <div className="field">
          <label className="field-label">이메일 *</label>
          <input
            type="email"
            className="text-input"
            placeholder="email@example.com"
            value={form.email}
            onChange={(e) => set("email", e.target.value)}
          />
        </div>

        <div className="field">
          <label className="field-label">
            상호명 <span className="text-[var(--muted)]">(선택)</span>
          </label>
          <input
            type="text"
            className="text-input"
            placeholder="상호명"
            value={form.company}
            onChange={(e) => set("company", e.target.value)}
          />
        </div>

        <div className="field">
          <label className="field-label">지역 *</label>
          <select
            className="text-input"
            value={form.region}
            onChange={(e) => set("region", e.target.value)}
          >
            <option value="">지역 선택</option>
            {REGIONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>

        {error && (
          <p className="text-[13px] text-[var(--danger)] text-center">
            {error}
          </p>
        )}

        <button
          onClick={handleSubmit}
          disabled={busy}
          className="btn btn-primary w-full mt-2"
        >
          <UserPlus size={18} />
          {busy ? "가입 중…" : "가입하기"}
        </button>

        <p className="text-[13px] text-[var(--muted)] text-center mt-2">
          이미 계정이 있으신가요?{" "}
          <button
            onClick={() => router.push("/login")}
            className="text-[var(--ink)] font-medium underline underline-offset-2"
          >
            로그인
          </button>
        </p>
      </section>
    </main>
  );
}
