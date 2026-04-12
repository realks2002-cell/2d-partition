import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const { login_id, password, name, phone, email, company, region } =
      await req.json();

    if (!login_id || !password || !name || !phone || !email || !region) {
      return NextResponse.json(
        { error: "필수 항목을 모두 입력해주세요" },
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
        phone,
        email,
        company: company || null,
        region,
      })
      .select("id")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(
      { message: "가입 완료. 관리자 승인을 기다려주세요.", userId: data.id },
      { status: 201 },
    );
  } catch {
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
