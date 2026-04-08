"use client";

const TOKEN = process.env.NEXT_PUBLIC_APP_API_TOKEN ?? "";

export function authHeaders(): HeadersInit {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (TOKEN) h.Authorization = `Bearer ${TOKEN}`;
  return h;
}
