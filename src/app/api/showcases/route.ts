import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

export const revalidate = 60;

export async function GET() {
  const sb = createServerClient();
  const { data } = await sb
    .from("partiApp_showcases")
    .select("id, title, subtitle, description, category, palette, image_url, is_featured, order_index")
    .eq("is_active", true)
    .order("order_index", { ascending: true });

  return NextResponse.json({ showcases: data ?? [] });
}
