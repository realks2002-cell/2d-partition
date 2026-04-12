import { NextRequest, NextResponse } from "next/server";
import { checkAuth, checkAdmin } from "@/lib/api-guard";
import { createServerClient } from "@/lib/supabase";

async function getFirebaseAccessToken(): Promise<string> {
  const serviceAccount = JSON.parse(
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON!,
  );

  const header = btoa(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const now = Math.floor(Date.now() / 1000);
  const claimSet = btoa(
    JSON.stringify({
      iss: serviceAccount.client_email,
      scope: "https://www.googleapis.com/auth/firebase.messaging",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    }),
  );

  const { subtle } = globalThis.crypto;
  const pemBody = serviceAccount.private_key
    .replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "")
    .replace(/\n/g, "");
  const keyData = Uint8Array.from(atob(pemBody), (c) => c.charCodeAt(0));
  const key = await subtle.importKey(
    "pkcs8",
    keyData,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const input = new TextEncoder().encode(`${header}.${claimSet}`);
  const sig = await subtle.sign("RSASSA-PKCS1-v1_5", key, input);
  const signature = btoa(String.fromCharCode(...new Uint8Array(sig)));

  const jwt = `${header}.${claimSet}.${signature}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  const data = await res.json();
  return data.access_token;
}

export async function POST(req: NextRequest) {
  const auth = await checkAuth(req);
  if (auth instanceof NextResponse) return auth;
  const adminErr = checkAdmin(auth);
  if (adminErr) return adminErr;

  try {
    const { title, body } = await req.json();

    if (!title || !body) {
      return NextResponse.json(
        { error: "제목과 내용을 입력해주세요" },
        { status: 400 },
      );
    }

    const sb = createServerClient();
    const { data: tokens } = await sb
      .from("partiApp_fcm_tokens")
      .select("token");

    if (!tokens || tokens.length === 0) {
      return NextResponse.json({ sent: 0, failed: 0 });
    }

    const projectId = JSON.parse(
      process.env.FIREBASE_SERVICE_ACCOUNT_JSON!,
    ).project_id;
    const accessToken = await getFirebaseAccessToken();

    let sent = 0;
    let failed = 0;

    await Promise.all(
      tokens.map(async ({ token }) => {
        try {
          const res = await fetch(
            `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                message: { token, notification: { title, body } },
              }),
            },
          );
          if (res.ok) sent++;
          else failed++;
        } catch {
          failed++;
        }
      }),
    );

    return NextResponse.json({ sent, failed });
  } catch (err) {
    console.error("[/api/admin/push] error", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
