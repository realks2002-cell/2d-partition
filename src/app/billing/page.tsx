"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Receipt, Zap, ExternalLink } from "lucide-react";
import { apiUrl, authHeaders } from "@/lib/api-client";
import { useNative } from "@/lib/use-native";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import SiteHeader from "@/components/SiteHeader";
import NativeBlocked from "@/components/NativeBlocked";

interface Payment {
  id: number;
  order_id: string;
  plan: string;
  amount: number;
  quota_granted: number;
  status: string;
  method: string | null;
  receipt_url: string | null;
  created_at: string;
  paid_at: string | null;
}

interface QuotaLog {
  id: number;
  delta: number;
  reason: string;
  balance_after: number;
  meta: Record<string, unknown> | null;
  created_at: string;
}

const REASON_LABEL: Record<string, string> = {
  signup_bonus: "가입 보너스",
  render: "렌더링 사용",
  refund: "환불",
  purchase: "결제 충전",
  admin_grant: "관리자 지급",
  admin_revoke: "관리자 회수",
};

const PLAN_LABEL: Record<string, string> = {
  standard: "Standard",
  pro: "Pro",
  premium: "Premium",
};

const STATUS_LABEL: Record<string, { text: string; cls: string }> = {
  paid: { text: "완료", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  pending: { text: "대기", cls: "bg-neutral-100 text-neutral-600 border-neutral-200" },
  failed: { text: "실패", cls: "bg-red-50 text-red-700 border-red-200" },
  cancelled: { text: "취소", cls: "bg-neutral-100 text-neutral-500 border-neutral-200" },
  refunded: { text: "환불", cls: "bg-amber-50 text-amber-700 border-amber-200" },
};

function fmt(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export default function BillingPage() {
  const router = useRouter();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [logs, setLogs] = useState<QuotaLog[]>([]);
  const [quota, setQuota] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const native = useNative();

  useEffect(() => {
    if (native) return;
    Promise.all([
      fetch(apiUrl("/api/me/payments"), { headers: authHeaders() }).then((r) => r.json()),
      fetch(apiUrl("/api/me/quota-logs"), { headers: authHeaders() }).then((r) => r.json()),
      fetch(apiUrl("/api/me/quota"), { headers: authHeaders() }).then((r) => r.json()),
    ])
      .then(([p, l, q]) => {
        setPayments(p.payments ?? []);
        setLogs(l.logs ?? []);
        setQuota(q.quota);
      })
      .finally(() => setLoading(false));
  }, [native]);

  if (native) {
    return (
      <NativeBlocked
        eyebrow="BILLING · WEB"
        title="결제 내역은 웹에서"
        description="결제 내역과 렌더링 횟수 사용 기록은 PC 또는 모바일 웹브라우저에서 로그인 후 확인해주세요."
        webPath="/billing"
      />
    );
  }

  const totalPaid = payments.filter((p) => p.status === "paid").reduce((s, p) => s + p.amount, 0);
  const totalRendered = logs.filter((l) => l.reason === "render").reduce((s, l) => s - l.delta, 0);

  return (
    <main className="min-h-[100dvh] bg-neutral-50 text-neutral-900 pb-safe">
      <SiteHeader />

      <div className="mx-auto px-6 py-10" style={{ maxWidth: 768 }}>
        <div className="flex items-center justify-between mb-4">
          <div className="iso-eyebrow">BILLING · HISTORY</div>
          <Button
            onClick={() => router.push("/pricing")}
            className="h-9 px-4 bg-neutral-900 hover:bg-[#d43e76] text-white text-[11px] font-bold uppercase tracking-[0.05em] rounded-md"
          >
            <Zap size={12} className="mr-1" /> 충전하기
          </Button>
        </div>
        <h1 className="iso-h1 text-[26px] mb-1">결제 및 사용 내역</h1>
        <p className="text-[13px] text-neutral-600 mb-8">
          구매한 렌더링 횟수와 사용 기록을 한눈에 확인하세요.
        </p>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
          <div className="bg-white rounded-xl border border-neutral-200 p-5">
            <div className="iso-eyebrow-muted mb-2">REMAINING</div>
            <div className="flex items-baseline gap-2">
              <span className="text-[26px] font-bold tracking-tight">{quota ?? "-"}</span>
              <span className="text-[13px] text-neutral-500">회</span>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-neutral-200 p-5">
            <div className="iso-eyebrow-muted mb-2">TOTAL SPENT</div>
            <div className="flex items-baseline gap-2">
              <span className="text-[26px] font-bold tracking-tight">₩{totalPaid.toLocaleString()}</span>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-neutral-200 p-5">
            <div className="iso-eyebrow-muted mb-2">TOTAL RENDERED</div>
            <div className="flex items-baseline gap-2">
              <span className="text-[26px] font-bold tracking-tight">{totalRendered}</span>
              <span className="text-[13px] text-neutral-500">회</span>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="py-16 text-center text-[13px] text-neutral-500">불러오는 중…</div>
        ) : (
          <Tabs defaultValue="payments" className="w-full">
            <TabsList className="bg-neutral-100 rounded-lg mb-4">
              <TabsTrigger value="payments" className="data-[state=active]:bg-white">결제 내역</TabsTrigger>
              <TabsTrigger value="usage" className="data-[state=active]:bg-white">사용 내역</TabsTrigger>
            </TabsList>

            <TabsContent value="payments">
              {payments.length === 0 ? (
                <div className="py-16 text-center text-[13px] text-neutral-500 border border-dashed border-neutral-300 rounded-xl">
                  결제 내역이 없습니다
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
                  {payments.map((p, idx) => {
                    const st = STATUS_LABEL[p.status] ?? { text: p.status, cls: "" };
                    return (
                      <div
                        key={p.id}
                        className={`flex items-center gap-4 p-4 ${idx !== payments.length - 1 ? "border-b border-neutral-100" : ""}`}
                      >
                        <div className="w-10 h-10 rounded-lg bg-neutral-100 flex items-center justify-center shrink-0">
                          <Receipt size={16} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[14px] font-bold">{PLAN_LABEL[p.plan] ?? p.plan}</span>
                            <span className="text-[12px] text-neutral-500">· {p.quota_granted}회 충전</span>
                            <span className={`text-[10px] px-2 py-0.5 border rounded-full font-medium ${st.cls}`}>
                              {st.text}
                            </span>
                          </div>
                          <div className="text-[11px] text-neutral-500 mono mt-0.5">
                            {fmt(p.paid_at ?? p.created_at)} · {p.method ?? "-"}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-[15px] font-bold">₩{p.amount.toLocaleString()}</div>
                          {p.receipt_url && (
                            <a
                              href={p.receipt_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[11px] text-[#d43e76] hover:underline inline-flex items-center gap-0.5 mt-0.5"
                            >
                              영수증 <ExternalLink size={10} />
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            <TabsContent value="usage">
              {logs.length === 0 ? (
                <div className="py-16 text-center text-[13px] text-neutral-500 border border-dashed border-neutral-300 rounded-xl">
                  사용 내역이 없습니다
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
                  {logs.map((l, idx) => (
                    <div
                      key={l.id}
                      className={`flex items-center justify-between gap-3 p-4 ${idx !== logs.length - 1 ? "border-b border-neutral-100" : ""}`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-semibold">{REASON_LABEL[l.reason] ?? l.reason}</div>
                        <div className="text-[11px] text-neutral-500 mono">{fmt(l.created_at)}</div>
                      </div>
                      <div className="text-right">
                        <div className={`text-[14px] font-bold ${l.delta > 0 ? "text-emerald-600" : "text-neutral-900"}`}>
                          {l.delta > 0 ? "+" : ""}{l.delta}
                        </div>
                        <div className="text-[10px] text-neutral-400">잔여 {l.balance_after}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </main>
  );
}
