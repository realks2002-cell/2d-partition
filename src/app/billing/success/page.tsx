"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, Loader2, AlertCircle, ExternalLink, Smartphone } from "lucide-react";
import { apiUrl, authHeaders } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import SiteHeader from "@/components/SiteHeader";

const DEEP_LINK_SUCCESS = "kanmakigo://payment/success";

function SuccessContent() {
  const router = useRouter();
  const sp = useSearchParams();
  const [status, setStatus] = useState<"confirming" | "ok" | "error">("confirming");
  const [message, setMessage] = useState<string>("결제 승인 중…");
  const [result, setResult] = useState<{ quota_granted: number; balance: number; receipt_url?: string } | null>(null);
  const fromApp = sp.get("from") === "app";

  useEffect(() => {
    const paymentKey = sp.get("paymentKey");
    const orderId = sp.get("orderId");
    const amount = Number(sp.get("amount"));
    if (!paymentKey || !orderId || !amount) {
      setStatus("error");
      setMessage("결제 정보가 올바르지 않습니다");
      return;
    }

    (async () => {
      try {
        const res = await fetch(apiUrl("/api/payments/confirm"), {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({ paymentKey, orderId, amount }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "결제 승인 실패");
        setResult(json);
        setStatus("ok");
        window.dispatchEvent(new Event("quota-changed"));
      } catch (e) {
        setStatus("error");
        setMessage(e instanceof Error ? e.message : String(e));
      }
    })();
  }, [sp]);

  const [returning, setReturning] = useState(false);
  const [returnError, setReturnError] = useState<string | null>(null);

  const returnToApp = async () => {
    if (returning) return;
    setReturning(true);
    setReturnError(null);
    try {
      const res = await fetch(apiUrl("/api/auth/app-handoff"), {
        method: "POST",
        headers: authHeaders(),
      });
      const data = await res.json();
      if (!res.ok || !data.code) {
        throw new Error(data.error || "복귀 코드 발급 실패");
      }
      window.location.href = `${DEEP_LINK_SUCCESS}?code=${encodeURIComponent(data.code)}`;
    } catch (e) {
      setReturnError(e instanceof Error ? e.message : String(e));
      setReturning(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-md bg-white rounded-2xl border border-neutral-200 p-6 text-center">
        {status === "confirming" && (
          <>
            <Loader2 size={40} className="mx-auto mb-4 animate-spin text-[#d43e76]" strokeWidth={2} />
            <div className="iso-eyebrow-muted mb-3">PROCESSING</div>
            <h1 className="text-[22px] font-bold tracking-tight mb-2">결제 승인 중</h1>
            <p className="text-[13px] text-neutral-500">{message}</p>
          </>
        )}
        {status === "ok" && result && (
          <>
            <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 size={28} className="text-emerald-500" strokeWidth={2} />
            </div>
            <div className="iso-eyebrow mb-3">✓ CHARGED</div>
            <h1 className="iso-display text-[28px] mb-2">충전 완료</h1>
            <div className="flex items-baseline justify-center gap-2 mb-2">
              <span className="text-[32px] font-bold tracking-tight text-[#d43e76]">+{result.quota_granted}</span>
              <span className="text-[15px] text-neutral-500">회</span>
            </div>
            <p className="text-[13px] text-neutral-500 mb-6">
              현재 잔액 <span className="font-bold text-neutral-900">{result.balance}회</span>
            </p>
            {result.receipt_url && (
              <a
                href={result.receipt_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[12px] text-[#d43e76] hover:underline mb-5"
              >
                영수증 보기 <ExternalLink size={11} />
              </a>
            )}
            <div className="space-y-2 pt-3 border-t border-neutral-900">
              {fromApp ? (
                <>
                  <Button
                    onClick={returnToApp}
                    disabled={returning}
                    className="w-full h-11 bg-neutral-900 hover:bg-[#d43e76] text-white text-[12px] font-bold uppercase tracking-[0.05em] rounded-lg"
                  >
                    {returning ? (
                      <>
                        <Loader2 size={14} className="mr-1.5 animate-spin" />
                        준비 중…
                      </>
                    ) : (
                      <>
                        <Smartphone size={14} className="mr-1.5" />
                        앱으로 돌아가기 →
                      </>
                    )}
                  </Button>
                  {returnError ? (
                    <p className="text-[11px] text-red-600 mt-1">{returnError}</p>
                  ) : (
                    <p className="text-[11px] text-neutral-400">
                      앱이 열리지 않으면 홈 화면에서 칸막이Go 앱을 열어주세요.
                    </p>
                  )}
                </>
              ) : (
                <>
                  <Button
                    onClick={() => router.push("/")}
                    className="w-full h-11 bg-neutral-900 hover:bg-[#d43e76] text-white text-[12px] font-bold uppercase tracking-[0.05em] rounded-lg"
                  >
                    렌더링 시작하기 →
                  </Button>
                  <button
                    onClick={() => router.push("/billing")}
                    className="w-full h-9 text-[12px] text-neutral-500 hover:text-[#d43e76]"
                  >
                    결제 내역 보기
                  </button>
                </>
              )}
            </div>
          </>
        )}
        {status === "error" && (
          <>
            <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
              <AlertCircle size={28} className="text-red-500" strokeWidth={2} />
            </div>
            <div className="iso-eyebrow-muted mb-3">FAILED</div>
            <h1 className="text-[22px] font-bold tracking-tight mb-2">결제 처리 오류</h1>
            <p className="text-[12px] text-neutral-500 mb-6">{message}</p>
            <Button
              onClick={() => router.push("/pricing")}
              className="w-full h-11 bg-neutral-900 hover:bg-[#d43e76] text-white text-[12px] font-bold uppercase tracking-[0.05em] rounded-lg"
            >
              다시 시도
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <main className="min-h-[100dvh] bg-neutral-50 flex flex-col">
      <SiteHeader />
      <Suspense fallback={<div className="flex-1" />}>
        <SuccessContent />
      </Suspense>
    </main>
  );
}
