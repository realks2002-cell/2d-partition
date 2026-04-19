import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { checkAuth, checkRateLimit } from "@/lib/api-guard";
import { createServerClient } from "@/lib/supabase";

const CODE_TTL_SEC = 180;

export async function POST(req: NextRequest) {
  const rate = checkRateLimit(req);
  if (rate) return rate;

  const auth = await checkAuth(req);
  if (auth instanceof NextResponse) return auth;

  const sb = createServerClient();
  const nowIso = new Date().toISOString();

  // 같은 user+purpose 활성 코드가 있으면 재사용(버튼 중복 클릭 / 새로고침 대비)
  const { data: existing } = await sb
    .from("partiApp_auth_codes")
    .select("code, expires_at, device_id")
    .eq("user_id", auth.userId)
    .eq("purpose", "app-handoff")
    .is("consumed_at", null)
    .gt("expires_at", nowIso)
    .maybeSingle();

  if (existing && existing.device_id === auth.deviceId) {
    const remaining = Math.max(
      0,
      Math.floor((new Date(existing.expires_at).getTime() - Date.now()) / 1000),
    );
    return NextResponse.json({ code: existing.code, expires_in: remaining });
  }

  const code = randomBytes(24).toString("base64url");
  const expiresAt = new Date(Date.now() + CODE_TTL_SEC * 1000).toISOString();

  const { error } = await sb.from("partiApp_auth_codes").upsert(
    {
      code,
      user_id: auth.userId,
      device_id: auth.deviceId,
      purpose: "app-handoff",
      consumed_at: null,
      expires_at: expiresAt,
    },
    { onConflict: "code" },
  );
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ code, expires_in: CODE_TTL_SEC });
}
