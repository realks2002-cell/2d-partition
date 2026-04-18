import { NextRequest, NextResponse } from "next/server";
import { checkAuth } from "@/lib/api-guard";
import { createServerClient } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const auth = await checkAuth(req);
  if (auth instanceof NextResponse) return auth;

  const sb = createServerClient();
  const { data } = await sb
    .from("partiApp_payments")
    .select("id, order_id, plan, amount, quota_granted, status, method, receipt_url, created_at, paid_at")
    .eq("user_id", auth.userId)
    .order("created_at", { ascending: false })
    .limit(100);

  return NextResponse.json({ payments: data ?? [] });
}
