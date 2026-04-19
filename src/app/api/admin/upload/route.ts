import { NextRequest, NextResponse } from "next/server";
import { checkAuth, checkAdmin } from "@/lib/api-guard";
import { createServerClient } from "@/lib/supabase";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_SIZE = 5 * 1024 * 1024;
const BUCKET = "showcase-images";

export async function POST(req: NextRequest) {
  const auth = await checkAuth(req);
  if (auth instanceof NextResponse) return auth;
  const adminErr = checkAdmin(auth);
  if (adminErr) return adminErr;

  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "파일이 없습니다" }, { status: 400 });
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: "JPG/PNG/WebP/GIF만 업로드 가능합니다" }, { status: 400 });
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "5MB 이하 파일만 가능합니다" }, { status: 400 });
    }

    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const key = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const sb = createServerClient();
    const arrayBuffer = await file.arrayBuffer();
    const { error: upErr } = await sb.storage
      .from(BUCKET)
      .upload(key, arrayBuffer, {
        contentType: file.type,
        cacheControl: "31536000",
        upsert: false,
      });

    if (upErr) {
      return NextResponse.json({ error: upErr.message }, { status: 500 });
    }

    const { data } = sb.storage.from(BUCKET).getPublicUrl(key);
    return NextResponse.json({ ok: true, url: data.publicUrl, key }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "업로드 실패";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
