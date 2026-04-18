"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Receipt, Zap, ExternalLink } from "lucide-react";
import { apiUrl, authHeaders } from "@/lib/api-client";

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
  standard: "스탠다드",
  pro: "프로",
  premium: "프리미엄",
};

const STATUS_LABEL: Record<string, { text: string; cls: string }> = {
  paid: { text: "완료", cls: "text-[var(--success)]" },
  pending: { text: "대기", cls: "text-[var(--muted)]" },
  failed: { text: "실패", cls: "text-[var(--danger)]" },
  cancelled: { text: "취소", cls: "text-[var(--muted)]" },
  refunded: { text: "환불", cls: "text-[var(--muted)]" },
};

function fmt(iso: string) {
  const d = new Date(iso);
  return `${String(d.getFullYear()).slice(2)}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export default function BillingPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"payments" | "usage">("payments");
  const [payments, setPayments] = useState<Payment[]>([]);
  const [logs, setLogs] = useState<QuotaLog[]>([]);
  const [quota, setQuota] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
  }, []);

  return (
    <main className="min-h-[100dvh] mx-auto px-5 pt-safe pb-8" style={{ maxWidth: 720 }}>
      <header className="flex items-center justify-between py-3">
        <button onClick={() => router.back()} className="btn-icon"><ArrowLeft size={16} /></button>
        <h1 className="text-[13px] font-semibold">결제 및 사용 내역</h1>
        <button
          onClick={() => router.push("/pricing")}
          className="inline-flex items-center gap-1 px-2 h-[24px] bg-[var(--ink)] text-[var(--surface)] text-[10px] font-medium rounded-md"
        >
          <Zap size={10} /> 충전
        </button>
      </header>

      {quota !== null && (
        <div className="flex items-center justify-between bg-[var(--surface)] border border-[var(--line)] rounded-lg p-3 mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[var(--accent-tint)] flex items-center justify-center">
              <Zap size={13} className="text-[var(--accent)]" />
            </div>
            <div>
              <div className="text-[9px] text-[var(--muted)]">현재 잔여</div>
              <div className="text-[14px] font-semibold">{quota}회</div>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-0.5 border-b border-[var(--line)] mb-2">
        {(["payments", "usage"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-1.5 text-[11px] font-medium border-b-2 -mb-px ${
              tab === t
                ? "border-[var(--ink)] text-[var(--ink)]"
                : "border-transparent text-[var(--muted)]"
            }`}
          >
            {t === "payments" ? "결제 내역" : "사용 내역"}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-10 text-center text-[10px] text-[var(--muted)]">불러오는 중…</div>
      ) : tab === "payments" ? (
        payments.length === 0 ? (
          <div className="py-10 text-center text-[10px] text-[var(--muted)]">결제 내역이 없습니다</div>
        ) : (
          <div className="divide-y divide-[var(--line)]">
            {payments.map((p) => {
              const st = STATUS_LABEL[p.status] ?? { text: p.status, cls: "" };
              return (
                <div key={p.id} className="py-2.5 flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-[var(--surface-2)] flex items-center justify-center">
                    <Receipt size={13} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-medium">
                        {PLAN_LABEL[p.plan] ?? p.plan} · {p.quota_granted}회
                      </span>
                      <span className={`text-[9px] ${st.cls}`}>{st.text}</span>
                    </div>
                    <div className="text-[9px] text-[var(--muted)] mono">
                      {fmt(p.paid_at ?? p.created_at)} · {p.method ?? "-"}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[12px] font-semibold">
                      ₩{p.amount.toLocaleString()}
                    </div>
                    {p.receipt_url && (
                      <a
                        href={p.receipt_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[9px] text-[var(--accent)] underline inline-flex items-center gap-0.5"
                      >
                        영수증 <ExternalLink size={8} />
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : logs.length === 0 ? (
        <div className="py-10 text-center text-[10px] text-[var(--muted)]">사용 내역이 없습니다</div>
      ) : (
        <div className="divide-y divide-[var(--line)]">
          {logs.map((l) => (
            <div key={l.id} className="py-2 flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="text-[11px] font-medium">
                  {REASON_LABEL[l.reason] ?? l.reason}
                </div>
                <div className="text-[9px] text-[var(--muted)] mono">{fmt(l.created_at)}</div>
              </div>
              <div className="text-right">
                <div className={`text-[12px] font-semibold ${l.delta > 0 ? "text-[var(--success)]" : "text-[var(--ink)]"}`}>
                  {l.delta > 0 ? "+" : ""}{l.delta}
                </div>
                <div className="text-[9px] text-[var(--muted)]">잔여 {l.balance_after}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
