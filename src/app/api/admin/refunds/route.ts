import { NextRequest, NextResponse } from "next/server";
import { checkAuth, checkAdmin } from "@/lib/api-guard";
import { createServerClient } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const auth = await checkAuth(req);
  if (auth instanceof NextResponse) return auth;
  const adminErr = checkAdmin(auth);
  if (adminErr) return adminErr;

  const sb = createServerClient();
  const { data: refunds } = await sb
    .from("partiApp_refunds")
    .select(
      "id, payment_id, user_id, amount, quota_revoked, reason, note, admin_id, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(500);

  const userIds = [...new Set((refunds ?? []).map((r) => r.user_id))];
  const adminIds = [...new Set((refunds ?? []).map((r) => r.admin_id).filter(Boolean))];
  const paymentIds = [...new Set((refunds ?? []).map((r) => r.payment_id))];
  const allUserIds = [...new Set([...userIds, ...adminIds])];

  const [{ data: users }, { data: payments }] = await Promise.all([
    allUserIds.length
      ? sb.from("partiApp_users").select("id, login_id, name").in("id", allUserIds)
      : Promise.resolve({ data: [] }),
    paymentIds.length
      ? sb
          .from("partiApp_payments")
          .select("id, order_id, plan, amount")
          .in("id", paymentIds)
      : Promise.resolve({ data: [] }),
  ]);

  const userMap = new Map((users ?? []).map((u) => [u.id, u]));
  const paymentMap = new Map((payments ?? []).map((p) => [p.id, p]));

  const rows = (refunds ?? []).map((r) => ({
    ...r,
    user: userMap.get(r.user_id) ?? null,
    admin: r.admin_id ? userMap.get(r.admin_id) ?? null : null,
    payment: paymentMap.get(r.payment_id) ?? null,
  }));

  const totalRefunded = rows.reduce((s, r) => s + r.amount, 0);
  const totalQuotaRevoked = rows.reduce((s, r) => s + r.quota_revoked, 0);

  return NextResponse.json({
    refunds: rows,
    summary: {
      count: rows.length,
      total_amount: totalRefunded,
      total_quota_revoked: totalQuotaRevoked,
    },
  });
}
