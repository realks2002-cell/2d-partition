import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { signToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { login_id, password, device_id } = await req.json();

    if (!login_id || !password || !device_id) {
      return NextResponse.json(
        { error: "아이디, 비밀번호, 기기 정보가 필요합니다" },
        { status: 400 },
      );
    }

    const sb = createServerClient();

    const { data: user } = await sb
      .from("partiApp_users")
      .select("id, name, role, status, password")
      .eq("login_id", login_id)
      .single();

    if (!user || user.password !== password) {
      return NextResponse.json(
        { error: "아이디 또는 비밀번호가 틀렸습니다" },
        { status: 401 },
      );
    }

    if (user.status === "pending") {
      return NextResponse.json(
        { error: "관리자 승인 대기 중입니다" },
        { status: 403 },
      );
    }

    if (user.status === "blocked") {
      return NextResponse.json(
        { error: "차단된 계정입니다" },
        { status: 403 },
      );
    }

    // 기존 세션 삭제 (단일 세션 강제)
    await sb.from("partiApp_sessions").delete().eq("user_id", user.id);

    // JWT 발급
    const token = await signToken({
      sub: user.id,
      role: user.role,
      deviceId: device_id,
    });

    // 새 세션 생성
    await sb.from("partiApp_sessions").insert({
      user_id: user.id,
      device_id,
      token,
    });

    return NextResponse.json({
      token,
      user: { id: user.id, name: user.name, role: user.role },
    });
  } catch {
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
