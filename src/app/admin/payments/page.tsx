"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Search, RotateCcw, X, Trash2 } from "lucide-react";
import { apiUrl, authHeaders, getUser } from "@/lib/api-client";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import RefundModal from "@/components/RefundModal";

interface PaymentRow {
  id: number;
  user_id: number;
  order_id: string;
  plan: string;
  amount: number;
  quota_granted: number;
  refunded_amount?: number;
  refunded_quota?: number;
  status: string;
  method: string | null;
  created_at: string;
  paid_at: string | null;
  user: { id: number; login_id: string; name: string } | null;
}

interface RefundRow {
  id: number;
  payment_id: number;
  user_id: number;
  amount: number;
  quota_revoked: number;
  reason: string;
  note: string | null;
  admin_id: number | null;
  created_at: string;
  user: { id: number; login_id: string; name: string } | null;
  admin: { id: number; name: string } | null;
  payment: { id: number; order_id: string; plan: string; amount: number } | null;
}

const PLAN_LABEL: Record<string, string> = {
  standard: "Standard",
  pro: "Pro",
  premium: "Premium",
};

const STATUS_CLS: Record<string, string> = {
  paid: "bg-emerald-50 text-emerald-700 border-emerald-200",
  pending: "bg-neutral-100 text-neutral-600 border-neutral-200",
  failed: "bg-red-50 text-red-700 border-red-200",
  cancelled: "bg-neutral-100 text-neutral-500 border-neutral-200",
  refunded: "bg-amber-50 text-amber-700 border-amber-200",
  partial_refunded: "bg-amber-50 text-amber-700 border-amber-200",
};

const STATUS_LABEL: Record<string, string> = {
  paid: "완료",
  pending: "대기",
  failed: "실패",
  cancelled: "취소",
  refunded: "환불",
  partial_refunded: "부분환불",
};

const REASON_LABEL: Record<string, string> = {
  customer_request: "고객 요청",
  duplicate: "중복 결제",
  dissatisfaction: "불만",
  admin_void: "관리자 취소",
  other: "기타",
};

function fmt(iso: string) {
  const d = new Date(iso);
  return `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export default function AdminPaymentsPage() {
  const router = useRouter();
  const [rows, setRows] = useState<PaymentRow[]>([]);
  const [refunds, setRefunds] = useState<RefundRow[]>([]);
  const [refundSummary, setRefundSummary] = useState({
    count: 0,
    total_amount: 0,
    total_quota_revoked: 0,
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [refundTarget, setRefundTarget] = useState<PaymentRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [paymentsRes, refundsRes] = await Promise.all([
      fetch(apiUrl("/api/admin/payments"), { headers: authHeaders() }),
      fetch(apiUrl("/api/admin/refunds"), { headers: authHeaders() }),
    ]);
    if (paymentsRes.ok) {
      const data = await paymentsRes.json();
      setRows(data.payments);
    }
    if (refundsRes.ok) {
      const data = await refundsRes.json();
      setRefunds(data.refunds);
      setRefundSummary(data.summary);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const u = getUser();
    if (!u || u.role !== "admin") {
      router.replace("/admin/login");
      return;
    }
    load();
  }, [load, router]);

  const handleCancel = async (id: number) => {
    if (!confirm("이 미완료 결제를 취소하시겠습니까?")) return;
    const res = await fetch(apiUrl(`/api/admin/payments/${id}/cancel`), {
      method: "POST",
      headers: authHeaders(),
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || "취소 실패");
      return;
    }
    load();
  };

  const handleDelete = async (id: number) => {
    if (!confirm("이 결제 레코드를 완전히 삭제하시겠습니까?\n(환불 이력은 유지됩니다)")) return;
    const res = await fetch(apiUrl(`/api/admin/payments/${id}/cancel`), {
      method: "DELETE",
      headers: authHeaders(),
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || "삭제 실패");
      return;
    }
    load();
  };

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (statusFilter && r.status !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const uName = r.user?.name?.toLowerCase() ?? "";
        const uLogin = r.user?.login_id?.toLowerCase() ?? "";
        if (
          !uName.includes(q) &&
          !uLogin.includes(q) &&
          !r.order_id.toLowerCase().includes(q)
        )
          return false;
      }
      return true;
    });
  }, [rows, search, statusFilter]);

  const stats = useMemo(() => {
    const paid = filtered.filter(
      (r) => r.status === "paid" || r.status === "partial_refunded" || r.status === "refunded",
    );
    const gross = paid.reduce((s, r) => s + r.amount, 0);
    const refundedOnFilter = paid.reduce((s, r) => s + (r.refunded_amount ?? 0), 0);
    const net = gross - refundedOnFilter;
    return { count: paid.length, gross, refunded: refundedOnFilter, net };
  }, [filtered]);

  const inputCls =
    "h-10 px-3 text-[13px] bg-white border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-neutral-900";

  return (
    <main className="min-h-[100dvh] bg-neutral-50 text-neutral-900 pt-safe pb-safe">
      <div className="sticky top-0 z-40 bg-white border-b border-neutral-200">
        <div
          className="mx-auto flex items-center justify-between px-6 h-14"
          style={{ maxWidth: 1024 }}
        >
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/admin")}
              className="inline-flex items-center gap-2 text-neutral-700 hover:text-[#d43e76] text-sm font-medium"
            >
              <ArrowLeft size={16} /> 관리자
            </button>
            <span className="text-neutral-300">|</span>
            <span className="iso-eyebrow">PAYMENTS</span>
          </div>
        </div>
      </div>

      <div className="mx-auto px-6 py-8" style={{ maxWidth: 1024 }}>
        <Tabs defaultValue="payments" className="w-full flex flex-col">
          {/* Tabs at page top */}
          <TabsList className="self-start bg-neutral-100 rounded-lg mb-6 shrink-0">
            <TabsTrigger value="payments" className="data-[state=active]:bg-white">
              결제 내역 ({filtered.length})
            </TabsTrigger>
            <TabsTrigger value="refunds" className="data-[state=active]:bg-white">
              환불 내역 ({refundSummary.count})
            </TabsTrigger>
          </TabsList>

          <h1 className="iso-h1 text-[26px] mb-1">결제 관리</h1>
          <p className="text-[13px] text-neutral-600 mb-5">
            전체 회원의 결제 · 환불 내역과 매출 현황을 확인합니다.
          </p>

          <TabsContent value="payments">
            {/* Payment stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <StatCard label="GROSS" value={`₩${stats.gross.toLocaleString()}`} />
              <StatCard
                label="REFUNDED"
                value={`-₩${stats.refunded.toLocaleString()}`}
                accent="text-amber-600"
              />
              <StatCard
                label="NET"
                value={`₩${stats.net.toLocaleString()}`}
                accent="text-emerald-600"
              />
              <StatCard label="TRANSACTIONS" value={`${stats.count}건`} />
            </div>

            <div className="flex items-center gap-2 mb-4 flex-wrap">
              <div className="relative flex-1 max-w-xs">
                <Search
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
                />
                <Input
                  type="text"
                  placeholder="회원명 · 아이디 · 주문번호"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-10 text-[13px]"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className={inputCls}
              >
                <option value="">전체 상태</option>
                <option value="paid">완료</option>
                <option value="partial_refunded">부분환불</option>
                <option value="refunded">환불</option>
                <option value="pending">대기</option>
                <option value="failed">실패</option>
              </select>
              <div className="flex-1" />
              <span className="text-[12px] text-neutral-500">총 {filtered.length}건</span>
            </div>

            {loading ? (
              <LoadingBox />
            ) : filtered.length === 0 ? (
              <EmptyBox>결제 내역이 없습니다</EmptyBox>
            ) : (
              <div className="bg-white border border-neutral-200 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12 text-center">#</TableHead>
                      <TableHead>회원</TableHead>
                      <TableHead>플랜</TableHead>
                      <TableHead className="text-right">금액</TableHead>
                      <TableHead className="text-right">환불</TableHead>
                      <TableHead className="text-center">상태</TableHead>
                      <TableHead className="text-center">결제일시</TableHead>
                      <TableHead className="text-center">처리</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((r) => {
                      const refundable =
                        (r.status === "paid" || r.status === "partial_refunded") &&
                        (r.amount - (r.refunded_amount ?? 0)) > 0;
                      const cancellable = r.status === "pending";
                      const deletable =
                        r.status === "pending" ||
                        r.status === "cancelled" ||
                        r.status === "failed";
                      return (
                        <TableRow key={r.id}>
                          <TableCell className="text-center text-[11px] text-neutral-400 mono">
                            {r.id}
                          </TableCell>
                          <TableCell>
                            <div className="font-semibold text-[13px]">
                              {r.user?.name ?? "-"}
                            </div>
                            <div className="text-[11px] text-neutral-500 mono">
                              {r.user?.login_id ?? `#${r.user_id}`}
                            </div>
                          </TableCell>
                          <TableCell className="text-[13px] font-medium">
                            {PLAN_LABEL[r.plan] ?? r.plan}
                            <div className="text-[10px] text-neutral-500">
                              {r.quota_granted}회
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-bold text-[14px]">
                            ₩{r.amount.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right">
                            {(r.refunded_amount ?? 0) > 0 ? (
                              <div className="text-amber-700 text-[12px] font-semibold">
                                -₩{(r.refunded_amount ?? 0).toLocaleString()}
                              </div>
                            ) : (
                              <span className="text-[11px] text-neutral-300">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            <span
                              className={`text-[10px] px-2 py-0.5 border rounded-full font-medium ${STATUS_CLS[r.status] ?? ""}`}
                            >
                              {STATUS_LABEL[r.status] ?? r.status}
                            </span>
                          </TableCell>
                          <TableCell className="text-center text-[11px] text-neutral-500 mono">
                            {fmt(r.paid_at ?? r.created_at)}
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1">
                              {refundable && (
                                <button
                                  onClick={() => setRefundTarget(r)}
                                  className="inline-flex items-center gap-1 px-2 h-7 border border-neutral-300 hover:border-[#d43e76] hover:text-[#d43e76] rounded-md text-[11px] font-semibold transition-colors"
                                >
                                  <RotateCcw size={10} /> 환불
                                </button>
                              )}
                              {cancellable && (
                                <button
                                  onClick={() => handleCancel(r.id)}
                                  className="inline-flex items-center gap-1 px-2 h-7 border border-neutral-300 hover:border-amber-500 hover:text-amber-600 rounded-md text-[11px] font-semibold transition-colors"
                                  title="결제 취소 (미완료 건)"
                                >
                                  <X size={10} /> 취소
                                </button>
                              )}
                              {deletable && (
                                <button
                                  onClick={() => handleDelete(r.id)}
                                  className="w-7 h-7 flex items-center justify-center text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                  title="삭제"
                                >
                                  <Trash2 size={11} />
                                </button>
                              )}
                              {!refundable && !cancellable && !deletable && (
                                <span className="text-[10px] text-neutral-300">-</span>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>

          <TabsContent value="refunds">
            {/* Refund stats */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
              <StatCard label="REFUND COUNT" value={`${refundSummary.count}건`} />
              <StatCard
                label="TOTAL REFUNDED"
                value={`₩${refundSummary.total_amount.toLocaleString()}`}
                accent="text-amber-600"
              />
              <StatCard
                label="QUOTA REVOKED"
                value={`${refundSummary.total_quota_revoked}회`}
              />
            </div>

            {loading ? (
              <LoadingBox />
            ) : refunds.length === 0 ? (
              <EmptyBox>환불 내역이 없습니다</EmptyBox>
            ) : (
              <div className="bg-white border border-neutral-200 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12 text-center">#</TableHead>
                      <TableHead>회원</TableHead>
                      <TableHead>주문</TableHead>
                      <TableHead className="text-right">환불액</TableHead>
                      <TableHead className="text-center">회수</TableHead>
                      <TableHead>사유</TableHead>
                      <TableHead className="text-center">처리자</TableHead>
                      <TableHead className="text-center">일시</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {refunds.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="text-center text-[11px] text-neutral-400 mono">
                          {r.id}
                        </TableCell>
                        <TableCell>
                          <div className="font-semibold text-[13px]">
                            {r.user?.name ?? "-"}
                          </div>
                          <div className="text-[11px] text-neutral-500 mono">
                            {r.user?.login_id ?? `#${r.user_id}`}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-[12px] font-medium">
                            {PLAN_LABEL[r.payment?.plan ?? ""] ?? r.payment?.plan ?? "-"}
                          </div>
                          <div className="text-[10px] text-neutral-400 mono">
                            #{r.payment_id}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-bold text-[14px] text-amber-700">
                          -₩{r.amount.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-center text-[13px]">
                          {r.quota_revoked > 0 ? `-${r.quota_revoked}` : "-"}
                        </TableCell>
                        <TableCell>
                          <div className="text-[12px] font-medium">
                            {REASON_LABEL[r.reason] ?? r.reason}
                          </div>
                          {r.note && (
                            <div className="text-[10px] text-neutral-500 mt-0.5 max-w-[180px] truncate" title={r.note}>
                              {r.note}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-center text-[11px] text-neutral-500">
                          {r.admin?.name ?? "-"}
                        </TableCell>
                        <TableCell className="text-center text-[11px] text-neutral-500 mono">
                          {fmt(r.created_at)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <RefundModal
        open={!!refundTarget}
        onClose={() => setRefundTarget(null)}
        onSuccess={() => {
          setRefundTarget(null);
          load();
        }}
        payment={refundTarget}
      />
    </main>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-neutral-200 px-3 py-2 flex items-center justify-between gap-3 whitespace-nowrap">
      <span className="iso-eyebrow-muted">{label}</span>
      <span className={`text-[14px] font-bold tracking-tight ${accent ?? ""}`}>
        {value}
      </span>
    </div>
  );
}

function LoadingBox() {
  return (
    <div className="py-16 text-center text-[13px] text-neutral-500 bg-white rounded-xl border border-neutral-200">
      불러오는 중…
    </div>
  );
}

function EmptyBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="py-16 text-center text-[13px] text-neutral-500 border border-dashed border-neutral-300 rounded-xl">
      {children}
    </div>
  );
}
