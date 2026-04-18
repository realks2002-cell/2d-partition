import { NextRequest, NextResponse } from "next/server";
import { checkAuth } from "@/lib/api-guard";
import { createServerClient } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const auth = await checkAuth(req);
  if (auth instanceof NextResponse) return auth;

  const sb = createServerClient();
  const { data } = await sb
    .from("partiApp_quota_logs")
    .select("id, delta, reason, balance_after, meta, created_at")
    .eq("user_id", auth.userId)
    .order("created_at", { ascending: false })
    .limit(100);

  return NextResponse.json({ logs: data ?? [] });
}
