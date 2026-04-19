import { NextRequest, NextResponse } from "next/server";
import { checkAuth, checkAdmin } from "@/lib/api-guard";
import { createServerClient } from "@/lib/supabase";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await checkAuth(req);
  if (auth instanceof NextResponse) return auth;
  const adminErr = checkAdmin(auth);
  if (adminErr) return adminErr;

  const { id } = await params;
  const sb = createServerClient();

  const { data: payment } = await sb
    .from("partiApp_payments")
    .select("id, status")
    .eq("id", Number(id))
    .single();

  if (!payment) {
    return NextResponse.json({ error: "결제를 찾을 수 없습니다" }, { status: 404 });
  }
  if (payment.status !== "pending") {
    return NextResponse.json(
      { error: `취소 불가 상태 (${payment.status})` },
      { status: 400 },
    );
  }

  const { error } = await sb
    .from("partiApp_payments")
    .update({
      status: "cancelled",
      cancelled_at: new Date().toISOString(),
    })
    .eq("id", payment.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await checkAuth(req);
  if (auth instanceof NextResponse) return auth;
  const adminErr = checkAdmin(auth);
  if (adminErr) return adminErr;

  const { id } = await params;
  const sb = createServerClient();

  const { data: payment } = await sb
    .from("partiApp_payments")
    .select("id, status")
    .eq("id", Number(id))
    .single();

  if (!payment) {
    return NextResponse.json({ error: "결제를 찾을 수 없습니다" }, { status: 404 });
  }
  // 삭제는 미완료 결제만 (paid는 환불 절차 필수)
  if (payment.status !== "pending" && payment.status !== "cancelled" && payment.status !== "failed") {
    return NextResponse.json(
      { error: `삭제 불가 (${payment.status}) — 환불을 먼저 진행하세요` },
      { status: 400 },
    );
  }

  const { error } = await sb
    .from("partiApp_payments")
    .delete()
    .eq("id", payment.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
