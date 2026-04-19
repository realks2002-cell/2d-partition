"use client";

import { useEffect, useState } from "react";
import { Loader2, AlertCircle } from "lucide-react";
import { apiUrl, authHeaders } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface Payment {
  id: number;
  order_id: string;
  plan: string;
  amount: number;
  quota_granted: number;
  refunded_amount?: number;
  refunded_quota?: number;
  status: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  payment: Payment | null;
}

const REASONS: { value: string; label: string }[] = [
  { value: "customer_request", label: "고객 요청" },
  { value: "duplicate", label: "중복 결제" },
  { value: "dissatisfaction", label: "서비스 불만" },
  { value: "admin_void", label: "관리자 취소" },
  { value: "other", label: "기타" },
];

export default function RefundModal({ open, onClose, onSuccess, payment }: Props) {
  const [amount, setAmount] = useState<string>("");
  const [reason, setReason] = useState("customer_request");
  const [note, setNote] = useState("");
  const [revokeQuota, setRevokeQuota] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<{ refunded: number; quota: number } | null>(null);

  const remainingAmount = payment
    ? payment.amount - (payment.refunded_amount ?? 0)
    : 0;
  const remainingQuota = payment
    ? payment.quota_granted - (payment.refunded_quota ?? 0)
    : 0;

  useEffect(() => {
    if (open && payment) {
      setAmount(String(remainingAmount));
      const proportionalQuota = Math.round(
        (payment.quota_granted * remainingAmount) / payment.amount,
      );
      setRevokeQuota(String(Math.min(proportionalQuota, remainingQuota)));
      setReason("customer_request");
      setNote("");
      setError("");
      setSuccess(null);
    }
  }, [open, payment, remainingAmount, remainingQuota]);

  // 금액 변경 시 회수 렌더링 횟수 비례 자동 계산
  const handleAmountChange = (val: string) => {
    setAmount(val);
    if (!payment) return;
    const n = Number(val);
    if (!Number.isFinite(n) || n <= 0) return;
    const propQuota = Math.round((payment.quota_granted * n) / payment.amount);
    setRevokeQuota(String(Math.min(propQuota, remainingQuota)));
  };

  if (!payment) return null;

  const submit = async () => {
    setBusy(true);
    setError("");
    try {
      const n = Number(amount);
      const q = Number(revokeQuota);
      if (!Number.isFinite(n) || n <= 0 || n > remainingAmount) {
        setError(`환불 금액은 1 ~ ${remainingAmount.toLocaleString()}원`);
        setBusy(false);
        return;
      }
      if (!Number.isFinite(q) || q < 0 || q > remainingQuota) {
        setError(`회수 렌더링 횟수는 0 ~ ${remainingQuota}회`);
        setBusy(false);
        return;
      }

      const res = await fetch(apiUrl(`/api/admin/payments/${payment.id}/refund`), {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ amount: n, reason, note, revoke_quota: q }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "환불 실패");
        setBusy(false);
        return;
      }
      setSuccess({ refunded: data.refunded_amount, quota: data.quota_revoked });
      setBusy(false);
      onSuccess?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  };

  const isFullRefund = Number(amount) === remainingAmount;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && !busy && onClose()}>
      <DialogContent className="sm:max-w-md bg-white rounded-2xl p-5 gap-0">
        {success ? (
          <div className="text-center py-4">
            <div className="iso-eyebrow mb-3" style={{ color: "#10b981" }}>✓ REFUND COMPLETED</div>
            <h2 className="text-[20px] font-bold tracking-tight mb-2">환불 완료</h2>
            <div className="text-[13px] text-neutral-600 mb-5">
              <div>
                ₩<span className="font-bold text-neutral-900">{success.refunded.toLocaleString()}</span> 환불
              </div>
              <div>
                회수 <span className="font-bold text-neutral-900">{success.quota}</span>회
              </div>
            </div>
            <Button
              onClick={onClose}
              className="w-full h-10 bg-neutral-900 hover:bg-[#d43e76] text-white text-[12px] font-bold uppercase tracking-[0.05em] rounded-lg"
            >
              닫기
            </Button>
          </div>
        ) : (
          <>
            <DialogHeader className="mb-3">
              <div className="iso-eyebrow mb-1" style={{ color: "#d43e76" }}>
                REFUND · {isFullRefund ? "FULL" : "PARTIAL"}
              </div>
              <DialogTitle className="text-[18px] font-bold tracking-tight">
                결제 환불
              </DialogTitle>
              <DialogDescription className="text-[11px] text-neutral-500 mono">
                #{payment.id} · {payment.order_id}
              </DialogDescription>
            </DialogHeader>

            {/* Summary */}
            <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-3 mb-4 text-[12px]">
              <div className="flex justify-between mb-1">
                <span className="text-neutral-500">결제 금액</span>
                <span className="font-bold">₩{payment.amount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between mb-1">
                <span className="text-neutral-500">기환불</span>
                <span>₩{(payment.refunded_amount ?? 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between pt-1 mt-1 border-t border-neutral-200">
                <span className="text-neutral-700 font-semibold">환불 가능</span>
                <span className="font-bold text-[#d43e76]">
                  ₩{remainingAmount.toLocaleString()} · {remainingQuota}회
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-[11px] font-semibold">환불 사유</Label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full h-10 px-3 text-[13px] bg-white border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-neutral-900"
                >
                  {REASONS.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold">환불 금액 (원)</Label>
                  <Input
                    type="number"
                    value={amount}
                    onChange={(e) => handleAmountChange(e.target.value)}
                    className="h-10 text-[13px]"
                    min={1}
                    max={remainingAmount}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold">회수 렌더링 횟수 (회)</Label>
                  <Input
                    type="number"
                    value={revokeQuota}
                    onChange={(e) => setRevokeQuota(e.target.value)}
                    className="h-10 text-[13px]"
                    min={0}
                    max={remainingQuota}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] font-semibold">메모 (선택)</Label>
                <Input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="h-10 text-[13px]"
                  placeholder="상세 사유"
                  maxLength={200}
                />
              </div>

              {error && (
                <div className="flex items-start gap-2 px-3 py-2 bg-red-50 border border-red-200 text-red-700 text-[11px] rounded-md">
                  <AlertCircle size={12} className="mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button
                  onClick={onClose}
                  disabled={busy}
                  variant="outline"
                  className="flex-1 h-10 text-[12px] font-medium border-neutral-300"
                >
                  취소
                </Button>
                <Button
                  onClick={submit}
                  disabled={busy}
                  className="flex-1 h-10 bg-neutral-900 hover:bg-[#d43e76] text-white text-[12px] font-bold uppercase tracking-[0.05em] rounded-md"
                >
                  {busy ? (
                    <>
                      <Loader2 size={12} className="animate-spin mr-1" />
                      처리중…
                    </>
                  ) : (
                    <>환불 실행 →</>
                  )}
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
