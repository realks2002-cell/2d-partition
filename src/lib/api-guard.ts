import { NextRequest, NextResponse } from "next/server";

const WINDOW_MS = 60_000; // 1 minute
const MAX_PER_WINDOW = 10;
const DAILY_LIMIT = 200;

interface Counter {
  windowStart: number;
  windowCount: number;
  dayStart: number;
  dayCount: number;
}

const counters = new Map<string, Counter>();

function getClientKey(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  return fwd?.split(",")[0]?.trim() ?? "unknown";
}

export function checkRateLimit(req: NextRequest): NextResponse | null {
  const key = getClientKey(req);
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  let c = counters.get(key);
  if (!c) {
    c = { windowStart: now, windowCount: 0, dayStart: now, dayCount: 0 };
    counters.set(key, c);
  }
  if (now - c.windowStart > WINDOW_MS) {
    c.windowStart = now;
    c.windowCount = 0;
  }
  if (now - c.dayStart > day) {
    c.dayStart = now;
    c.dayCount = 0;
  }
  c.windowCount += 1;
  c.dayCount += 1;
  if (c.windowCount > MAX_PER_WINDOW) {
    return NextResponse.json(
      { error: `Rate limit exceeded (max ${MAX_PER_WINDOW}/min)` },
      { status: 429 },
    );
  }
  if (c.dayCount > DAILY_LIMIT) {
    return NextResponse.json(
      { error: `Daily limit exceeded (max ${DAILY_LIMIT}/day)` },
      { status: 429 },
    );
  }
  return null;
}

export function checkAuth(req: NextRequest): NextResponse | null {
  const expected = process.env.APP_API_TOKEN;
  if (!expected) return null;
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (token !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}
