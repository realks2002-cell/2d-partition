"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import SiteHeader from "@/components/SiteHeader";

export default function PaymentFailPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const code = sp.get("code") ?? "";
  const message = sp.get("message") ?? "결제가 취소되었거나 실패했습니다";

  return (
    <main className="min-h-[100dvh] bg-neutral-50 flex flex-col">
      <SiteHeader />
      <div className="flex-1 flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-md bg-white rounded-2xl border border-neutral-200 p-6 text-center">
        <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
          <AlertCircle size={28} className="text-red-500" strokeWidth={2} />
        </div>
        <div className="iso-eyebrow-muted mb-3">FAILED · CANCELLED</div>
        <h1 className="iso-display text-[24px] mb-2">결제 실패</h1>
        <p className="text-[13px] text-neutral-600 mb-1">{message}</p>
        {code && <div className="text-[11px] mono text-neutral-400 mb-6">[{code}]</div>}

        <div className="space-y-2 pt-4 mt-4 border-t border-neutral-900">
          <Button
            onClick={() => router.push("/pricing")}
            className="w-full h-11 bg-neutral-900 hover:bg-[#d43e76] text-white text-[12px] font-bold uppercase tracking-[0.05em] rounded-lg"
          >
            다시 시도
          </Button>
          <button
            onClick={() => router.push("/")}
            className="w-full h-9 text-[12px] text-neutral-500 hover:text-[#d43e76]"
          >
            홈으로
          </button>
        </div>
      </div>
      </div>
    </main>
  );
}
