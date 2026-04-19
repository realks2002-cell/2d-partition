"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Zap, Loader2, Wallet } from "lucide-react";
import { apiUrl, authHeaders, getToken, getUser, saveToken, saveUser } from "@/lib/api-client";
import { useNative } from "@/lib/use-native";
import { Button } from "@/components/ui/button";
import SiteHeader from "@/components/SiteHeader";
import NativeBlocked from "@/components/NativeBlocked";

type PlanId = "standard" | "pro" | "premium";

const PAY_METHOD = "토스페이";

interface Plan {
  id: PlanId;
  name: string;
  price: number;
  quota: number;
  highlight?: boolean;
  perks: string[];
}

const PLANS: Plan[] = [
  {
    id: "standard",
    name: "Standard",
    price: 10000,
    quota: 30,
    perks: ["렌더링 30회", "만료 없음 (소진 시까지)", "기본 지원"],
  },
  {
    id: "pro",
    name: "Pro",
    price: 30000,
    quota: 115,
    highlight: true,
    perks: ["렌더링 115회", "회당 단가 22% 할인", "만료 없음", "우선 지원"],
  },
  {
    id: "premium",
    name: "Premium",
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
  const [fromApp, setFromApp] = useState(false);
  const native = useNative();

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (native !== false) return; // undefined/true 모두 가드

    const params = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const exchange = hashParams.get("t") ?? params.get("t");
    const fa = params.get("from") === "app";
    if (fa) setFromApp(true);

    const loadQuota = () => {
      setLoggedIn(!!getToken());
      if (getToken()) {
        fetch(apiUrl("/api/me/quota"), { headers: authHeaders() })
          .then((r) => (r.ok ? r.json() : null))
          .then((d) => d && setQuota(d.quota))
          .catch(() => {});
      }
    };

    if (exchange) {
      // URL + fragment 즉시 제거 (히스토리 보호)
      const cleanUrl = window.location.pathname + (fa ? "?from=app" : "");
      window.history.replaceState(null, "", cleanUrl);
      fetch(apiUrl("/api/auth/web-login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ exchange_token: exchange }),
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (d?.token && d?.user) {
            saveToken(d.token);
            saveUser(d.user);
          }
        })
        .catch(() => {})
        .finally(loadQuota);
    } else {
      loadQuota();
    }
  }, [native]);

  if (native) {
    return (
      <NativeBlocked
        eyebrow="RENDER COUNT · WEB"
        title="렌더링 횟수 충전은 웹에서"
        description="렌더링 횟수 충전은 PC 또는 모바일 웹브라우저에서 로그인 후 이용해주세요. 앱에서는 충전한 횟수를 사용하실 수 있습니다."
        webPath="/pricing"
      />
    );
  }

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
          requestPayment: (method: string, opts: Record<string, unknown>) => Promise<void>;
        };
      };
      const toss = w.TossPayments(TOSS_CLIENT_KEY);

      const user = getUser();
      const origin = window.location.origin;

      const suffix = fromApp ? "?from=app" : "";
      await toss.requestPayment(PAY_METHOD, {
        amount: plan.price,
        orderId: json.order_id,
        orderName: `칸막이Go ${plan.name} (${plan.quota}회)`,
        customerName: user?.name ?? "회원",
        successUrl: `${origin}/billing/success${suffix}`,
        failUrl: `${origin}/billing/fail${suffix}`,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(null);
    }
  };

  return (
    <main className="min-h-[100dvh] bg-neutral-50 text-neutral-900 pb-safe">
      <SiteHeader />

      <div className="mx-auto px-6 py-14" style={{ maxWidth: 920 }}>
        {/* Eyebrow + Display heading */}
        <div className="text-center mb-10">
          <div className="iso-eyebrow mb-4">PRICING · RENDER COUNT</div>
          <h1 className="iso-display text-[35px] md:text-[45px] mb-4">
            Render More, Sell Faster.
          </h1>
          <p className="text-[15px] text-neutral-600 max-w-xl mx-auto">
            현장에서 바로 보여줄 수 있는 렌더링 횟수를 충전하세요.
            <br />
            만료 없이 소진할 때까지 사용합니다.
          </p>

          {quota !== null && (
            <div className="inline-flex items-center gap-2 mt-6 px-4 py-2 border border-neutral-900 rounded-full">
              <Zap size={14} className="text-[#d43e76]" />
              <span className="text-[12px] font-medium text-neutral-700">현재 잔여</span>
              <span className="text-[13px] font-bold">{quota}회</span>
            </div>
          )}
        </div>

        {error && (
          <div className="max-w-xl mx-auto mb-6 px-4 py-3 bg-red-50 border border-red-200 text-red-700 text-[13px] rounded-lg">
            {error}
          </div>
        )}

        {/* Toss Pay 안내 배지 */}
        <div className="max-w-md mx-auto mt-8 flex items-center justify-center gap-2 h-11 bg-white border border-neutral-300 rounded-lg">
          <Wallet size={14} className="text-[#d43e76]" strokeWidth={2.2} />
          <span className="text-[12px] font-bold uppercase tracking-[0.05em] text-neutral-900">
            토스페이 간편결제
          </span>
          <span className="text-[11px] text-neutral-500">· 1초 결제</span>
        </div>

        {/* Plan grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-8">
          {PLANS.map((p) => (
            <div
              key={p.id}
              className={`relative bg-white flex flex-col p-5 rounded-2xl ${
                p.highlight
                  ? "ring-2 ring-neutral-900 shadow-xl"
                  : "border border-neutral-200"
              }`}
            >
              {p.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-[#d43e76] text-white text-[10px] font-bold uppercase tracking-[0.15em] rounded-full">
                  Most Popular
                </div>
              )}

              <div className="iso-eyebrow-muted mb-2">{p.id === "pro" ? "RECOMMENDED" : p.id.toUpperCase()}</div>
              <h2 className="text-[21px] font-bold tracking-tight mb-1">{p.name}</h2>

              <div className="flex items-baseline gap-1 mt-4 mb-1">
                <span className="text-[32px] font-bold tracking-tight">
                  ₩{p.price.toLocaleString()}
                </span>
              </div>
              <div className="text-[12px] text-neutral-500 mb-6">
                렌더링 <span className="font-bold text-neutral-900">{p.quota}회</span>
                <span className="mx-1">·</span>
                회당 {Math.round(p.price / p.quota).toLocaleString()}원
              </div>

              <ul className="flex-1 space-y-2.5 mb-7">
                {p.perks.map((perk, i) => (
                  <li key={i} className="flex items-start gap-2 text-[13px] text-neutral-700">
                    <Check size={14} className="text-emerald-500 mt-[3px] shrink-0" strokeWidth={2.5} />
                    <span>{perk}</span>
                  </li>
                ))}
              </ul>

              <Button
                onClick={() => purchase(p)}
                disabled={busy !== null}
                className={`w-full h-11 rounded-lg text-[12px] font-bold uppercase tracking-[0.05em] ${
                  p.highlight
                    ? "bg-[#d43e76] hover:bg-[#b93366] text-white"
                    : "bg-neutral-900 hover:bg-[#d43e76] text-white"
                }`}
              >
                {busy === p.id ? (
                  <>
                    <Loader2 size={14} className="animate-spin mr-1" />
                    이동 중…
                  </>
                ) : (
                  <>
                    <Wallet size={13} className="mr-1.5" strokeWidth={2.2} />
                    토스페이로 결제
                    <span className="ml-1">→</span>
                  </>
                )}
              </Button>
            </div>
          ))}
        </div>

        {/* Notes */}
        <div className="mt-12 pt-8 border-t border-neutral-900">
          <div className="iso-eyebrow-muted mb-3">POLICIES</div>
          <div className="grid md:grid-cols-3 gap-6 text-[12px] text-neutral-600 leading-relaxed">
            <div>
              <div className="text-[13px] font-bold text-neutral-900 mb-1">만료 없음</div>
              충전된 횟수는 기간 제한 없이 소진 시까지 사용할 수 있습니다.
            </div>
            <div>
              <div className="text-[13px] font-bold text-neutral-900 mb-1">안전한 결제</div>
              결제는 토스페이먼츠를 통해 암호화 처리되며 결제 정보는 보관하지 않습니다.
            </div>
            <div>
              <div className="text-[13px] font-bold text-neutral-900 mb-1">환불 정책</div>
              미사용분에 한해 결제 후 7일 이내 환불 가능합니다. 사용 내역이 있는 경우 차감 후 정산됩니다.
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
