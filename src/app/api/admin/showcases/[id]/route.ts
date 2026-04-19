import { NextRequest, NextResponse } from "next/server";
import { checkAuth, checkAdmin } from "@/lib/api-guard";
import { createServerClient } from "@/lib/supabase";

const VALID_PALETTES = ["neutral", "terracotta", "espresso", "sage", "sand", "graphite"];
const ALLOWED_FIELDS = [
  "title",
  "subtitle",
  "description",
  "category",
  "palette",
  "image_url",
  "is_featured",
  "order_index",
  "is_active",
];

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await checkAuth(req);
  if (auth instanceof NextResponse) return auth;
  const adminErr = checkAdmin(auth);
  if (adminErr) return adminErr;

  try {
    const { id } = await params;
    const body = await req.json();
    const updates: Record<string, unknown> = {};

    for (const k of ALLOWED_FIELDS) {
      if (body[k] !== undefined) updates[k] = body[k];
    }

    if (updates.palette && !VALID_PALETTES.includes(updates.palette as string)) {
      return NextResponse.json({ error: "palette 값이 올바르지 않습니다" }, { status: 400 });
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "수정할 항목이 없습니다" }, { status: 400 });
    }

    const sb = createServerClient();

    if (updates.is_featured === true) {
      await sb
        .from("partiApp_showcases")
        .update({ is_featured: false })
        .eq("is_featured", true)
        .neq("id", Number(id));
    }

    updates.updated_at = new Date().toISOString();

    const { data, error } = await sb
      .from("partiApp_showcases")
      .update(updates)
      .eq("id", Number(id))
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true, showcase: data });
  } catch {
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await checkAuth(req);
  if (auth instanceof NextResponse) return auth;
  const adminErr = checkAdmin(auth);
  if (adminErr) return adminErr;

  const { id } = await params;
  const sb = createServerClient();
  const { error } = await sb
    .from("partiApp_showcases")
    .delete()
    .eq("id", Number(id));

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
