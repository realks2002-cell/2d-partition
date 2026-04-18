import { NextRequest, NextResponse } from "next/server";
import { checkAuth, checkAdmin } from "@/lib/api-guard";
import { createServerClient } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const auth = await checkAuth(req);
  if (auth instanceof NextResponse) return auth;
  const adminErr = checkAdmin(auth);
  if (adminErr) return adminErr;

  const sb = createServerClient();
  const { data: payments } = await sb
    .from("partiApp_payments")
    .select("id, user_id, order_id, plan, amount, quota_granted, status, method, created_at, paid_at")
    .order("created_at", { ascending: false })
    .limit(500);

  const userIds = [...new Set((payments ?? []).map((p) => p.user_id))];
  const { data: users } = userIds.length
    ? await sb
        .from("partiApp_users")
        .select("id, login_id, name")
        .in("id", userIds)
    : { data: [] };

  const byId = new Map((users ?? []).map((u) => [u.id, u]));
  const rows = (payments ?? []).map((p) => ({
    ...p,
    user: byId.get(p.user_id) ?? null,
  }));

  return NextResponse.json({ payments: rows });
}
