import { NextRequest, NextResponse } from "next/server";
import { checkAuth, checkAdmin } from "@/lib/api-guard";
import { grantQuota } from "@/lib/quota";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await checkAuth(req);
  if (auth instanceof NextResponse) return auth;
  const adminErr = checkAdmin(auth);
  if (adminErr) return adminErr;

  try {
    const { id } = await params;
    const { delta, note } = await req.json();
    const userId = Number(id);
    const d = Number(delta);
    if (!userId || !Number.isFinite(d) || d === 0) {
      return NextResponse.json({ error: "delta가 올바르지 않습니다" }, { status: 400 });
    }

    const reason = d > 0 ? "admin_grant" : "admin_revoke";
    const balance = await grantQuota(userId, d, reason, {
      admin_id: auth.userId,
      note: note || null,
    });

    return NextResponse.json({ ok: true, balance });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "서버 오류" },
      { status: 500 },
    );
  }
}
