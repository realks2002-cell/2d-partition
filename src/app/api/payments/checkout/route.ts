import { NextRequest, NextResponse } from "next/server";
import { checkAuth } from "@/lib/api-guard";
import { createServerClient } from "@/lib/supabase";
import { PLANS } from "@/lib/quota";
import { randomUUID } from "crypto";

export async function POST(req: NextRequest) {
  const auth = await checkAuth(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const { plan } = await req.json();
    if (!plan || !(plan in PLANS)) {
      return NextResponse.json({ error: "플랜이 올바르지 않습니다" }, { status: 400 });
    }

    const p = PLANS[plan as keyof typeof PLANS];
    const order_id = `order_${Date.now()}_${randomUUID().slice(0, 8)}`;

    const sb = createServerClient();
    const { error } = await sb.from("partiApp_payments").insert({
      user_id: auth.userId,
      order_id,
      plan: p.id,
      amount: p.price,
      quota_granted: p.quota,
      status: "pending",
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      order_id,
      amount: p.price,
      plan: p.id,
      quota: p.quota,
    });
  } catch {
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
