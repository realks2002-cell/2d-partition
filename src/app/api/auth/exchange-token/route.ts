import { NextRequest, NextResponse } from "next/server";
import { checkAuth } from "@/lib/api-guard";
import { signExchangeToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const auth = await checkAuth(req);
  if (auth instanceof NextResponse) return auth;

  const token = await signExchangeToken({
    sub: auth.userId,
    role: auth.role,
    deviceId: auth.deviceId,
  });

  return NextResponse.json({ exchange_token: token, expires_in: 60 });
}
