"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle } from "lucide-react";

export default function PaymentFailPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const code = sp.get("code") ?? "";
  const message = sp.get("message") ?? "결제가 취소되었거나 실패했습니다";

  return (
    <main className="min-h-[100dvh] flex items-center justify-center px-5 pt-safe pb-safe">
      <div className="w-full max-w-sm bg-[var(--surface)] border border-[var(--line)] rounded-xl p-6 text-center">
        <AlertCircle size={36} className="mx-auto mb-3 text-[var(--danger)]" />
        <div className="text-[14px] font-semibold mb-1">결제 실패</div>
        <div className="text-[10px] text-[var(--muted)] mb-1">{message}</div>
        {code && <div className="text-[9px] mono text-[var(--muted)] mb-4">[{code}]</div>}
        <button
          onClick={() => router.push("/pricing")}
          className="w-full h-[34px] bg-[var(--ink)] text-[var(--surface)] rounded-lg text-[11px] font-medium"
        >
          다시 시도
        </button>
        <button
          onClick={() => router.push("/")}
          className="w-full h-[30px] mt-2 text-[10px] text-[var(--muted)] hover:text-[var(--ink)]"
        >
          홈으로
        </button>
      </div>
    </main>
  );
}
