"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Zap, Loader2, ArrowLeft } from "lucide-react";
import { apiUrl, authHeaders, getToken, getUser } from "@/lib/api-client";

type PlanId = "standard" | "pro" | "premium";

interface Plan {
  id: PlanId;
  name: string;
  price: number;
  quota: number;
  badge?: string;
  perks: string[];
}

const PLANS: Plan[] = [
  {
    id: "standard",
    name: "스탠다드",
    price: 10000,
    quota: 30,
    perks: ["렌더링 30회", "만료 없음 (소진 시까지)", "기본 지원"],
  },
  {
    id: "pro",
    name: "프로",
    price: 30000,
    quota: 115,
    badge: "인기",
    perks: ["렌더링 115회", "회당 단가 22% 할인", "만료 없음", "우선 지원"],
  },
  {
    id: "premium",
    name: "프리미엄",
    price: 50000,
    quota: 200,
    perks: ["렌더링 200회", "회당 단가 25% 할인", "만료 없음", "우선 지원"],
  },
];

const TOSS_CLIENT_KEY =
  process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY ?? "test_ck_docs_Ovk5rk1EwkEbP0W43n07xlzm";

function loadTossScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") return resolve();
    const w = window as unknown as { TossPayments?: unknown };
    if (w.TossPayments) return resolve();
    const script = document.createElement("script");
    script.src = "https://js.tosspayments.com/v1/payment";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("토스 SDK 로드 실패"));
    document.head.appendChild(script);
  });
}

export default function PricingPage() {
  const router = useRouter();
  const [busy, setBusy] = useState<PlanId | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [quota, setQuota] = useState<number | null>(null);
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setLoggedIn(!!getToken());
    if (getToken()) {
      fetch(apiUrl("/api/me/quota"), { headers: authHeaders() })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => d && setQuota(d.quota))
        .catch(() => {});
    }
  }, []);

  const purchase = async (plan: Plan) => {
    if (!loggedIn) {
      router.push(`/login?next=/pricing`);
      return;
    }
    setBusy(plan.id);
    setError(null);
    try {
      const res = await fetch(apiUrl("/api/payments/checkout"), {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ plan: plan.id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "주문 생성 실패");

      await loadTossScript();
      const w = window as unknown as {
        TossPayments: (k: string) => {
          requestPayment: (
            method: string,
            opts: Record<string, unknown>,
          ) => Promise<void>;
        };
      };
      const toss = w.TossPayments(TOSS_CLIENT_KEY);

      const user = getUser();
      const origin = window.location.origin;

      await toss.requestPayment("카드", {
        amount: plan.price,
        orderId: json.order_id,
        orderName: `칸막이Go ${plan.name} (${plan.quota}회)`,
        customerName: user?.name ?? "회원",
        successUrl: `${origin}/billing/success`,
        failUrl: `${origin}/billing/fail`,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(null);
    }
  };

  return (
    <main className="min-h-[100dvh] mx-auto px-5 pt-safe pb-10" style={{ maxWidth: 900 }}>
      <header className="flex items-center justify-between py-3">
        <button onClick={() => router.back()} className="btn-icon" aria-label="뒤로">
          <ArrowLeft size={16} />
        </button>
        <h1 className="text-[14px] font-semibold">렌더링 횟수 충전</h1>
        <button
          onClick={() => router.push("/billing")}
          className="text-[10px] text-[var(--muted)] hover:text-[var(--ink)]"
        >
          내역
        </button>
      </header>

      {quota !== null && (
        <div className="flex items-center justify-center gap-1.5 py-2 text-[11px] text-[var(--ink-3)]">
          <Zap size={11} className="text-[var(--accent)]" />
          현재 잔여 횟수 <span className="font-semibold text-[var(--ink)]">{quota}회</span>
        </div>
      )}

      {error && (
        <div className="my-2 p-2.5 bg-[var(--accent-tint)] text-[var(--danger)] text-[10px] rounded-md">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
        {PLANS.map((p) => (
          <div
            key={p.id}
            className={`relative bg-[var(--surface)] border rounded-xl p-5 flex flex-col ${
              p.badge
                ? "border-[var(--accent)] shadow-[0_0_0_2px_var(--accent-tint)]"
                : "border-[var(--line)]"
            }`}
          >
            {p.badge && (
              <div className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-[var(--accent)] text-white text-[9px] font-semibold rounded-full">
                {p.badge}
              </div>
            )}
            <div className="text-[13px] font-semibold mb-1">{p.name}</div>
            <div className="flex items-baseline gap-1 mb-1">
              <span className="text-[22px] font-bold">
                ₩{p.price.toLocaleString()}
              </span>
            </div>
            <div className="text-[10px] text-[var(--muted)] mb-3">
              렌더링 {p.quota}회 · 회당 {Math.round(p.price / p.quota).toLocaleString()}원
            </div>
            <ul className="flex-1 space-y-1.5 mb-4">
              {p.perks.map((perk, i) => (
                <li key={i} className="flex items-start gap-1.5 text-[10px]">
                  <Check size={11} className="text-[var(--success)] mt-[2px] shrink-0" />
                  <span>{perk}</span>
                </li>
              ))}
            </ul>
            <button
              onClick={() => purchase(p)}
              disabled={busy !== null}
              className={`w-full h-[36px] rounded-lg text-[12px] font-medium transition-colors ${
                p.badge
                  ? "bg-[var(--accent)] text-white hover:opacity-90"
                  : "bg-[var(--ink)] text-[var(--surface)] hover:opacity-90"
              } disabled:opacity-60 flex items-center justify-center gap-1.5`}
            >
              {busy === p.id ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  이동 중…
                </>
              ) : (
                "결제하기"
              )}
            </button>
          </div>
        ))}
      </div>

      <div className="mt-6 text-[9px] text-[var(--muted)] leading-relaxed space-y-0.5">
        <p>• 충전된 횟수는 만료 없이 소진 시까지 사용 가능합니다.</p>
        <p>• 결제는 토스페이먼츠를 통해 안전하게 처리됩니다.</p>
        <p>• 환불은 미사용분에 한해 결제 후 7일 이내 가능합니다.</p>
      </div>
    </main>
  );
}
