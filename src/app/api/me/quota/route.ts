import { NextRequest, NextResponse } from "next/server";
import { checkAuth } from "@/lib/api-guard";
import { createServerClient } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const auth = await checkAuth(req);
  if (auth instanceof NextResponse) return auth;

  const sb = createServerClient();
  const { data } = await sb
    .from("partiApp_users")
    .select("render_quota, plan, total_rendered")
    .eq("id", auth.userId)
    .single();

  if (!data) {
    return NextResponse.json({ error: "사용자 없음" }, { status: 404 });
  }

  return NextResponse.json({
    quota: data.render_quota,
    plan: data.plan,
    total_rendered: data.total_rendered,
  });
}
