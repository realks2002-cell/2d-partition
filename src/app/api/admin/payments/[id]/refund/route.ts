import { NextRequest, NextResponse } from "next/server";
import { checkAuth, checkAdmin } from "@/lib/api-guard";
import { createServerClient } from "@/lib/supabase";
import { grantQuota } from "@/lib/quota";

const TOSS_CANCEL_URL = (paymentKey: string) =>
  `https://api.tosspayments.com/v1/payments/${encodeURIComponent(paymentKey)}/cancel`;

const REASONS = new Set([
  "customer_request",
  "duplicate",
  "dissatisfaction",
  "admin_void",
  "other",
]);

interface RefundBody {
  amount?: number; // 부분환불 금액, 미지정 시 전액
  reason: string;
  note?: string;
  revoke_quota?: number; // 회수할 렌더링 횟수 (기본: 비례 계산)
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await checkAuth(req);
  if (auth instanceof NextResponse) return auth;
  const adminErr = checkAdmin(auth);
  if (adminErr) return adminErr;

  const secret = process.env.TOSS_SECRET_KEY;
  if (!secret) {
    return NextResponse.json(
      { error: "TOSS_SECRET_KEY 미설정" },
      { status: 500 },
    );
  }

  try {
    const { id } = await params;
    const body = (await req.json()) as RefundBody;
    const { reason, note } = body;

    if (!reason || !REASONS.has(reason)) {
      return NextResponse.json({ error: "사유가 올바르지 않습니다" }, { status: 400 });
    }

    const sb = createServerClient();

    const { data: payment } = await sb
      .from("partiApp_payments")
      .select("*")
      .eq("id", Number(id))
      .single();

    if (!payment) {
      return NextResponse.json({ error: "결제를 찾을 수 없습니다" }, { status: 404 });
    }
    if (payment.status !== "paid" && payment.status !== "partial_refunded") {
      return NextResponse.json(
        { error: `환불 불가 상태 (${payment.status})` },
        { status: 400 },
      );
    }
    if (!payment.payment_key) {
      return NextResponse.json(
        { error: "토스 결제 키가 없어 환불할 수 없습니다" },
        { status: 400 },
      );
    }

    const remainingAmount = payment.amount - (payment.refunded_amount ?? 0);
    const refundAmount = Math.min(
      Math.max(1, body.amount ?? remainingAmount),
      remainingAmount,
    );

    if (refundAmount <= 0) {
      return NextResponse.json({ error: "환불 가능 금액이 없습니다" }, { status: 400 });
    }

    // 회수할 렌더링 횟수 계산 (명시 지정 or 비례)
    const proportionalQuota = Math.round(
      (payment.quota_granted * refundAmount) / payment.amount,
    );
    const remainingQuotaToRevoke = Math.max(
      0,
      payment.quota_granted - (payment.refunded_quota ?? 0),
    );
    const quotaToRevoke = Math.min(
      body.revoke_quota !== undefined ? Math.max(0, body.revoke_quota) : proportionalQuota,
      remainingQuotaToRevoke,
    );

    const reasonText =
      {
        customer_request: "고객 요청",
        duplicate: "중복 결제",
        dissatisfaction: "서비스 불만",
        admin_void: "관리자 취소",
        other: "기타",
      }[reason] ?? reason;

    // 토스 Cancel API 호출
    const authHeader = "Basic " + Buffer.from(secret + ":").toString("base64");
    const idempotencyKey = `refund_${payment.id}_${Date.now()}`;
    const tossBody: Record<string, unknown> = {
      cancelReason: note ? `${reasonText} — ${note}` : reasonText,
    };
    if (refundAmount < remainingAmount || payment.refunded_amount > 0) {
      tossBody.cancelAmount = refundAmount;
    }

    const tossRes = await fetch(TOSS_CANCEL_URL(payment.payment_key), {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
        "Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify(tossBody),
    });
    const tossJson = await tossRes.json();

    if (!tossRes.ok) {
      return NextResponse.json(
        { error: tossJson.message || "토스 환불 실패", code: tossJson.code, raw: tossJson },
        { status: 400 },
      );
    }

    // 가장 최근 cancel transaction key 추출
    const lastCancel =
      tossJson.cancels && tossJson.cancels.length > 0
        ? tossJson.cancels[tossJson.cancels.length - 1]
        : null;

    // 환불 이력 저장
    await sb.from("partiApp_refunds").insert({
      payment_id: payment.id,
      user_id: payment.user_id,
      amount: refundAmount,
      quota_revoked: quotaToRevoke,
      reason,
      note: note || null,
      toss_transaction_key: lastCancel?.transactionKey ?? null,
      toss_response: tossJson,
      admin_id: auth.userId,
    });

    // 결제 집계 업데이트
    const newRefundedAmount = (payment.refunded_amount ?? 0) + refundAmount;
    const newRefundedQuota = (payment.refunded_quota ?? 0) + quotaToRevoke;
    const newStatus =
      newRefundedAmount >= payment.amount ? "refunded" : "partial_refunded";

    await sb
      .from("partiApp_payments")
      .update({
        refunded_amount: newRefundedAmount,
        refunded_quota: newRefundedQuota,
        refund_reason: reason,
        last_refunded_at: new Date().toISOString(),
        status: newStatus,
      })
      .eq("id", payment.id);

    // 사용자 렌더링 횟수 회수 (보유량 이하로만)
    let quotaAfter: number | null = null;
    if (quotaToRevoke > 0) {
      try {
        quotaAfter = await grantQuota(
          payment.user_id,
          -quotaToRevoke,
          "admin_revoke",
          {
            refund_payment_id: payment.id,
            refund_amount: refundAmount,
            reason,
            admin_id: auth.userId,
          },
        );
      } catch (e) {
        console.error("[refund] grantQuota -N failed", e);
        // quota 회수 실패해도 환불 자체는 성공 처리 (돈은 이미 나감)
      }
    }

    return NextResponse.json({
      ok: true,
      refunded_amount: refundAmount,
      quota_revoked: quotaToRevoke,
      total_refunded: newRefundedAmount,
      status: newStatus,
      quota_after: quotaAfter,
    });
  } catch (e) {
    console.error("[/api/admin/payments/[id]/refund]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "서버 오류" },
      { status: 500 },
    );
  }
}

// GET: 특정 결제의 환불 이력
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await checkAuth(req);
  if (auth instanceof NextResponse) return auth;
  const adminErr = checkAdmin(auth);
  if (adminErr) return adminErr;

  const { id } = await params;
  const sb = createServerClient();
  const { data } = await sb
    .from("partiApp_refunds")
    .select("id, amount, quota_revoked, reason, note, admin_id, created_at, toss_transaction_key")
    .eq("payment_id", Number(id))
    .order("created_at", { ascending: false });

  return NextResponse.json({ refunds: data ?? [] });
}
