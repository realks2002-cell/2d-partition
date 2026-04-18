import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { grantQuota, SIGNUP_BONUS } from "@/lib/quota";
import { signToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { login_id, password, name, email, phone, company, region, device_id } =
      await req.json();

    if (!login_id || !password || !name || !email) {
      return NextResponse.json(
        { error: "아이디, 비밀번호, 이름, 이메일은 필수입니다" },
        { status: 400 },
      );
    }

    const sb = createServerClient();

    const { data: existing } = await sb
      .from("partiApp_users")
      .select("id")
      .eq("login_id", login_id)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: "이미 사용 중인 아이디입니다" },
        { status: 409 },
      );
    }

    const { data, error } = await sb
      .from("partiApp_users")
      .insert({
        login_id,
        password,
        name,
        email,
        phone: phone || "",
        company: company || null,
        region: region || "",
        status: "active",
      })
      .select("id, name, role")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    try {
      await grantQuota(data.id, SIGNUP_BONUS, "signup_bonus");
    } catch (e) {
      console.error("[signup] grant bonus failed", e);
    }

    let token: string | null = null;
    if (device_id) {
      try {
        await sb.from("partiApp_sessions").delete().eq("user_id", data.id);
        token = await signToken({
          sub: data.id,
          role: data.role,
          deviceId: device_id,
        });
        await sb.from("partiApp_sessions").insert({
          user_id: data.id,
          device_id,
          token,
        });
      } catch (e) {
        console.error("[signup] auto-login failed", e);
      }
    }

    return NextResponse.json(
      {
        message: "가입 완료",
        userId: data.id,
        bonus: SIGNUP_BONUS,
        token,
        user: token ? { id: data.id, name: data.name, role: data.role } : undefined,
      },
      { status: 201 },
    );
  } catch {
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
