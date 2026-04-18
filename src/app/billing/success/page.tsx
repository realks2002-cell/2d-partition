"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { apiUrl, authHeaders } from "@/lib/api-client";

export default function PaymentSuccessPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const [status, setStatus] = useState<"confirming" | "ok" | "error">("confirming");
  const [message, setMessage] = useState<string>("결제 승인 중…");
  const [result, setResult] = useState<{ quota_granted: number; balance: number; receipt_url?: string } | null>(null);

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

  return (
    <main className="min-h-[100dvh] flex items-center justify-center px-5 pt-safe pb-safe">
      <div className="w-full max-w-sm bg-[var(--surface)] border border-[var(--line)] rounded-xl p-6 text-center">
        {status === "confirming" && (
          <>
            <Loader2 size={32} className="mx-auto mb-3 animate-spin text-[var(--accent)]" />
            <div className="text-[13px] font-semibold mb-1">결제 승인 중</div>
            <div className="text-[10px] text-[var(--muted)]">{message}</div>
          </>
        )}
        {status === "ok" && result && (
          <>
            <CheckCircle2 size={36} className="mx-auto mb-3 text-[var(--success)]" />
            <div className="text-[14px] font-semibold mb-1">충전 완료</div>
            <div className="text-[11px] text-[var(--ink-3)] mb-4">
              +{result.quota_granted}회 · 현재 잔액 {result.balance}회
            </div>
            {result.receipt_url && (
              <a
                href={result.receipt_url}
                target="_blank"
                rel="noreferrer"
                className="block text-[10px] text-[var(--accent)] underline mb-3"
              >
                영수증 보기
              </a>
            )}
            <button
              onClick={() => router.push("/")}
              className="w-full h-[34px] bg-[var(--ink)] text-[var(--surface)] rounded-lg text-[11px] font-medium"
            >
              렌더링 시작하기
            </button>
            <button
              onClick={() => router.push("/billing")}
              className="w-full h-[30px] mt-2 text-[10px] text-[var(--muted)] hover:text-[var(--ink)]"
            >
              결제 내역 보기
            </button>
          </>
        )}
        {status === "error" && (
          <>
            <AlertCircle size={32} className="mx-auto mb-3 text-[var(--danger)]" />
            <div className="text-[13px] font-semibold mb-1">결제 처리 오류</div>
            <div className="text-[10px] text-[var(--muted)] mb-4">{message}</div>
            <button
              onClick={() => router.push("/pricing")}
              className="w-full h-[34px] bg-[var(--ink)] text-[var(--surface)] rounded-lg text-[11px] font-medium"
            >
              다시 시도
            </button>
          </>
        )}
      </div>
    </main>
  );
}
