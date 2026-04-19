import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { signToken } from "@/lib/auth";
import { checkRateLimit } from "@/lib/api-guard";

export async function POST(req: NextRequest) {
  const rate = checkRateLimit(req);
  if (rate) return rate;

  try {
    if (!req.headers.get("content-type")?.includes("application/json")) {
      return NextResponse.json({ error: "잘못된 요청 형식" }, { status: 400 });
    }
    const { code, device_id } = await req.json();
    if (!code || typeof code !== "string") {
      return NextResponse.json({ error: "코드가 필요합니다" }, { status: 400 });
    }
    if (!device_id || typeof device_id !== "string") {
      return NextResponse.json({ error: "기기 정보가 필요합니다" }, { status: 400 });
    }

    const sb = createServerClient();

    // 원자적 단일 소비: consumed_at IS NULL AND expires_at > now AND device_id 일치
    const nowIso = new Date().toISOString();
    const { data: row, error: consumeErr } = await sb
      .from("partiApp_auth_codes")
      .update({ consumed_at: nowIso })
      .eq("code", code)
      .eq("purpose", "app-handoff")
      .eq("device_id", device_id)
      .is("consumed_at", null)
      .gt("expires_at", nowIso)
      .select("user_id, device_id")
      .maybeSingle();

    if (consumeErr || !row) {
      return NextResponse.json(
        { error: "유효하지 않거나 만료된 코드" },
        { status: 401 },
      );
    }

    const { data: user } = await sb
      .from("partiApp_users")
      .select("id, name, role, status")
      .eq("id", row.user_id)
      .single();
    if (!user) {
      return NextResponse.json({ error: "사용자를 찾을 수 없습니다" }, { status: 404 });
    }
    if (user.status === "blocked") {
      return NextResponse.json({ error: "차단된 계정입니다" }, { status: 403 });
    }

    const newToken = await signToken({
      sub: user.id,
      role: user.role,
      deviceId: row.device_id,
    });

    // 세션 UPSERT (user_id unique 가정)
    const { error: upsertErr } = await sb
      .from("partiApp_sessions")
      .upsert(
        { user_id: user.id, device_id: row.device_id, token: newToken },
        { onConflict: "user_id" },
      );
    if (upsertErr) {
      console.error("[/api/auth/app-claim] session upsert", upsertErr);
      return NextResponse.json({ error: "세션 저장 실패" }, { status: 500 });
    }

    return NextResponse.json({
      token: newToken,
      user: { id: user.id, name: user.name, role: user.role },
    });
  } catch (e) {
    console.error("[/api/auth/app-claim]", e);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
