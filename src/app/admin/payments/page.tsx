"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Receipt, Search } from "lucide-react";
import { apiUrl, authHeaders, getUser } from "@/lib/api-client";

interface PaymentRow {
  id: number;
  user_id: number;
  order_id: string;
  plan: string;
  amount: number;
  quota_granted: number;
  status: string;
  method: string | null;
  created_at: string;
  paid_at: string | null;
  user: { id: number; login_id: string; name: string } | null;
}

const PLAN_LABEL: Record<string, string> = {
  standard: "스탠다드",
  pro: "프로",
  premium: "프리미엄",
};

const STATUS_CLS: Record<string, string> = {
  paid: "text-[var(--success)]",
  pending: "text-[var(--muted)]",
  failed: "text-[var(--danger)]",
  cancelled: "text-[var(--muted)]",
  refunded: "text-[var(--muted)]",
};

function fmt(iso: string) {
  const d = new Date(iso);
  return `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export default function AdminPaymentsPage() {
  const router = useRouter();
  const [rows, setRows] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("paid");

  const load = useCallback(async () => {
    const res = await fetch(apiUrl("/api/admin/payments"), { headers: authHeaders() });
    if (res.ok) {
      const data = await res.json();
      setRows(data.payments);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const u = getUser();
    if (!u || u.role !== "admin") { router.replace("/"); return; }
    load();
  }, [load, router]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (statusFilter && r.status !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const uName = r.user?.name?.toLowerCase() ?? "";
        const uLogin = r.user?.login_id?.toLowerCase() ?? "";
        if (!uName.includes(q) && !uLogin.includes(q) && !r.order_id.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [rows, search, statusFilter]);

  const totalRevenue = useMemo(
    () => filtered.filter((r) => r.status === "paid").reduce((s, r) => s + r.amount, 0),
    [filtered],
  );

  const inputCls = "h-[26px] px-2 text-[9px] bg-[var(--surface)] border border-[var(--line-2)] rounded-md focus:outline-none focus:border-[var(--ink)]";

  return (
    <main className="min-h-[100dvh] mx-auto px-5 pt-safe pb-safe" style={{ maxWidth: 1200 }}>
      <header className="flex items-center justify-between py-2">
        <div className="flex items-center gap-2">
          <button onClick={() => router.push("/admin")} className="btn-icon"><ArrowLeft size={14} /></button>
          <Receipt size={12} />
          <span className="font-semibold text-[11px]">결제 관리</span>
        </div>
        <div className="flex items-center gap-2 text-[10px]">
          <span className="text-[var(--muted)]">집계</span>
          <span className="font-semibold">₩{totalRevenue.toLocaleString()}</span>
          <span className="text-[var(--muted)]">({filtered.filter((r) => r.status === "paid").length}건)</span>
        </div>
      </header>

      <div className="flex items-center gap-2 py-2 border-y border-[var(--line)]">
        <div className="relative">
          <Search size={10} className="absolute left-2 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
          <input
            type="text"
            placeholder="회원·주문번호"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`${inputCls} pl-6`}
            style={{ width: 180 }}
          />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={inputCls} style={{ width: 110 }}>
          <option value="">전체 상태</option>
          <option value="paid">완료</option>
          <option value="pending">대기</option>
          <option value="failed">실패</option>
          <option value="refunded">환불</option>
        </select>
        <div className="flex-1" />
        <span className="text-[9px] text-[var(--muted)]">{filtered.length}건</span>
      </div>

      {loading ? (
        <div className="py-10 text-center text-[10px] text-[var(--muted)]">불러오는 중…</div>
      ) : (
        <div className="overflow-x-auto pb-10">
          <table className="w-full text-[9px]" style={{ minWidth: 900 }}>
            <thead>
              <tr className="border-b border-[var(--line)] text-center text-[var(--ink-3)]">
                <th className="py-2 px-1.5 w-8">#</th>
                <th className="py-2 px-1.5 text-left">회원</th>
                <th className="py-2 px-1.5 text-left">플랜</th>
                <th className="py-2 px-1.5 text-right">금액</th>
                <th className="py-2 px-1.5 text-center">횟수</th>
                <th className="py-2 px-1.5 text-center">수단</th>
                <th className="py-2 px-1.5 text-center">상태</th>
                <th className="py-2 px-1.5 text-center">결제일시</th>
                <th className="py-2 px-1.5 text-left">주문번호</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-b border-[var(--line)] hover:bg-[var(--surface-2)]">
                  <td className="py-2 px-1.5 text-center mono text-[var(--muted)]">{r.id}</td>
                  <td className="py-2 px-1.5">
                    <div className="font-medium">{r.user?.name ?? "-"}</div>
                    <div className="text-[8px] text-[var(--muted)] mono">{r.user?.login_id ?? `#${r.user_id}`}</div>
                  </td>
                  <td className="py-2 px-1.5">{PLAN_LABEL[r.plan] ?? r.plan}</td>
                  <td className="py-2 px-1.5 text-right font-semibold">₩{r.amount.toLocaleString()}</td>
                  <td className="py-2 px-1.5 text-center">{r.quota_granted}</td>
                  <td className="py-2 px-1.5 text-center text-[var(--muted)]">{r.method ?? "-"}</td>
                  <td className={`py-2 px-1.5 text-center font-medium ${STATUS_CLS[r.status] ?? ""}`}>{r.status}</td>
                  <td className="py-2 px-1.5 text-center text-[var(--muted)] mono">{fmt(r.paid_at ?? r.created_at)}</td>
                  <td className="py-2 px-1.5 text-left mono text-[var(--muted)]">{r.order_id}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
