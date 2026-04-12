import { NextRequest, NextResponse } from "next/server";
import { checkAuth } from "@/lib/api-guard";
import { createServerClient } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const auth = await checkAuth(req);
  if (auth instanceof NextResponse) return auth;

  const sb = createServerClient();
  const { data: user } = await sb
    .from("partiApp_users")
    .select("id, name, role, status")
    .eq("id", auth.userId)
    .single();

  if (!user) {
    return NextResponse.json({ error: "사용자 없음" }, { status: 404 });
  }

  return NextResponse.json({ user });
}
