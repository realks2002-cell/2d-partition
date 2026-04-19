import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { signToken, verifyExchangeToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    if (req.headers.get("content-type")?.includes("application/json") !== true) {
      return NextResponse.json({ error: "잘못된 요청 형식" }, { status: 400 });
    }
    const { exchange_token } = await req.json();
    if (!exchange_token || typeof exchange_token !== "string") {
      return NextResponse.json({ error: "교환 토큰이 필요합니다" }, { status: 400 });
    }

    let payload;
    try {
      payload = await verifyExchangeToken(exchange_token);
    } catch {
      return NextResponse.json(
        { error: "만료되었거나 유효하지 않은 토큰입니다" },
        { status: 401 },
      );
    }

    const sb = createServerClient();
    const { data: user } = await sb
      .from("partiApp_users")
      .select("id, name, role, status")
      .eq("id", payload.userId)
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
      deviceId: payload.deviceId,
    });

    // UPSERT: 기존 row 유지하며 token만 교체 (DELETE/INSERT race 방지)
    const { data: existing } = await sb
      .from("partiApp_sessions")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (existing) {
      await sb
        .from("partiApp_sessions")
        .update({ token: newToken, device_id: payload.deviceId })
        .eq("user_id", user.id);
    } else {
      await sb.from("partiApp_sessions").insert({
        user_id: user.id,
        device_id: payload.deviceId,
        token: newToken,
      });
    }

    return NextResponse.json({
      token: newToken,
      user: { id: user.id, name: user.name, role: user.role },
    });
  } catch {
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
