import { NextRequest, NextResponse } from "next/server";
import { checkAuth } from "@/lib/api-guard";
import { createServerClient } from "@/lib/supabase";
import { grantQuota } from "@/lib/quota";

const TOSS_API = "https://api.tosspayments.com/v1/payments/confirm";

export async function POST(req: NextRequest) {
  const auth = await checkAuth(req);
  if (auth instanceof NextResponse) return auth;

  const secret = process.env.TOSS_SECRET_KEY;
  if (!secret) {
    return NextResponse.json(
      { error: "TOSS_SECRET_KEY 미설정" },
      { status: 500 },
    );
  }

  try {
    const { paymentKey, orderId, amount } = await req.json();
    if (!paymentKey || !orderId || !amount) {
      return NextResponse.json(
        { error: "paymentKey, orderId, amount 필요" },
        { status: 400 },
      );
    }

    const sb = createServerClient();

    const { data: payment } = await sb
      .from("partiApp_payments")
      .select("*")
      .eq("order_id", orderId)
      .eq("user_id", auth.userId)
      .single();

    if (!payment) {
      return NextResponse.json({ error: "주문을 찾을 수 없습니다" }, { status: 404 });
    }
    if (payment.amount !== amount) {
      return NextResponse.json({ error: "금액 불일치" }, { status: 400 });
    }
    if (payment.status === "paid") {
      return NextResponse.json({ ok: true, already: true, quota_granted: payment.quota_granted });
    }

    const authHeader =
      "Basic " + Buffer.from(secret + ":").toString("base64");
    const tossRes = await fetch(TOSS_API, {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ paymentKey, orderId, amount }),
    });
    const tossJson = await tossRes.json();

    if (!tossRes.ok) {
      await sb
        .from("partiApp_payments")
        .update({
          status: "failed",
          payment_key: paymentKey,
          raw: tossJson,
        })
        .eq("id", payment.id);
      return NextResponse.json(
        { error: tossJson.message || "결제 승인 실패", raw: tossJson },
        { status: 400 },
      );
    }

    await sb
      .from("partiApp_payments")
      .update({
        status: "paid",
        payment_key: paymentKey,
        method: tossJson.method,
        receipt_url: tossJson.receipt?.url ?? null,
        raw: tossJson,
        paid_at: tossJson.approvedAt ?? new Date().toISOString(),
      })
      .eq("id", payment.id);

    const newBalance = await grantQuota(
      auth.userId,
      payment.quota_granted,
      "purchase",
      { payment_id: payment.id, order_id: orderId, plan: payment.plan },
    );

    await sb
      .from("partiApp_users")
      .update({ plan: payment.plan })
      .eq("id", auth.userId);

    return NextResponse.json({
      ok: true,
      quota_granted: payment.quota_granted,
      balance: newBalance,
      receipt_url: tossJson.receipt?.url ?? null,
    });
  } catch (e) {
    console.error("[/api/payments/confirm]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "서버 오류" },
      { status: 500 },
    );
  }
}
