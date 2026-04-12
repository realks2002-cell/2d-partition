import { NextRequest, NextResponse } from "next/server";
import { checkAuth } from "@/lib/api-guard";
import { createServerClient } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const auth = await checkAuth(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const { token, platform = "android" } = await req.json();

    if (!token) {
      return NextResponse.json(
        { error: "FCM 토큰이 필요합니다" },
        { status: 400 },
      );
    }

    const sb = createServerClient();

    await sb.from("partiApp_fcm_tokens").upsert(
      {
        user_id: auth.userId,
        token,
        platform,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "token" },
    );

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
