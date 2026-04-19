import { NextRequest, NextResponse } from "next/server";
import { checkAuth, checkAdmin } from "@/lib/api-guard";
import { createServerClient } from "@/lib/supabase";

const VALID_PALETTES = ["neutral", "terracotta", "espresso", "sage", "sand", "graphite"];

export async function GET(req: NextRequest) {
  const auth = await checkAuth(req);
  if (auth instanceof NextResponse) return auth;
  const adminErr = checkAdmin(auth);
  if (adminErr) return adminErr;

  const sb = createServerClient();
  const { data } = await sb
    .from("partiApp_showcases")
    .select("*")
    .order("order_index", { ascending: true });

  return NextResponse.json({ showcases: data ?? [] });
}

export async function POST(req: NextRequest) {
  const auth = await checkAuth(req);
  if (auth instanceof NextResponse) return auth;
  const adminErr = checkAdmin(auth);
  if (adminErr) return adminErr;

  try {
    const body = await req.json();
    const {
      title,
      subtitle,
      description,
      category = "all",
      palette = "neutral",
      image_url,
      is_featured = false,
      order_index,
      is_active = true,
    } = body;

    if (!title || typeof title !== "string") {
      return NextResponse.json({ error: "제목은 필수입니다" }, { status: 400 });
    }
    if (!VALID_PALETTES.includes(palette)) {
      return NextResponse.json({ error: "palette가 올바르지 않습니다" }, { status: 400 });
    }

    const sb = createServerClient();

    // Featured 단독 보장
    if (is_featured) {
      await sb.from("partiApp_showcases").update({ is_featured: false }).eq("is_featured", true);
    }

    // order_index 자동 계산
    let nextOrder = order_index;
    if (nextOrder === undefined || nextOrder === null) {
      const { data: max } = await sb
        .from("partiApp_showcases")
        .select("order_index")
        .order("order_index", { ascending: false })
        .limit(1)
        .single();
      nextOrder = (max?.order_index ?? -1) + 1;
    }

    const { data, error } = await sb
      .from("partiApp_showcases")
      .insert({
        title,
        subtitle: subtitle || null,
        description: description || null,
        category,
        palette,
        image_url: image_url || null,
        is_featured,
        order_index: nextOrder,
        is_active,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, showcase: data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
