# auth-fcm Design Document

> **Plan 참조**: `docs/01-plan/features/auth-fcm.plan.md`
> **작성일**: 2026-04-12

## 1. Supabase 테이블 DDL

```sql
-- 001_auth_tables.sql

-- 사용자 테이블
CREATE TABLE "partiApp_users" (
  id SERIAL PRIMARY KEY,
  login_id VARCHAR(50) UNIQUE NOT NULL,
  password VARCHAR(100) NOT NULL,
  name VARCHAR(50) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  email VARCHAR(100) NOT NULL,
  company VARCHAR(100),  -- 선택
  region VARCHAR(50) NOT NULL,
  role VARCHAR(10) NOT NULL DEFAULT 'user',      -- 'user' | 'admin'
  status VARCHAR(10) NOT NULL DEFAULT 'pending',  -- 'pending' | 'active' | 'blocked'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 세션 테이블 (1 user = 1 session)
CREATE TABLE "partiApp_sessions" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_id VARCHAR(100) NOT NULL,
  token TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)  -- 사용자당 1개 세션만 허용
);

-- FCM 토큰 테이블
CREATE TABLE "partiApp_fcm_tokens" (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  platform VARCHAR(10) NOT NULL DEFAULT 'android',  -- 'android' | 'web'
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 인덱스
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_fcm_tokens_user_id ON fcm_tokens(user_id);
CREATE INDEX idx_users_login_id ON users(login_id);
CREATE INDEX idx_users_status ON users(status);
```

## 2. API 상세 설계

### 2.1 POST /api/auth/signup

```ts
// Request
{ login_id: string, password: string, name: string, phone: string, email: string, company?: string, region: string }

// Response 201
{ message: "가입 완료. 관리자 승인을 기다려주세요.", userId: number }

// Error 409
{ error: "이미 사용 중인 아이디입니다" }
```

**로직**:
1. login_id 중복 확인
2. users INSERT (status='pending')
3. 성공 응답

### 2.2 POST /api/auth/login

```ts
// Request
{ login_id: string, password: string, device_id: string }

// Response 200
{ token: string, user: { id: number, name: string, role: string } }

// Error
{ error: "아이디 또는 비밀번호가 틀렸습니다" }   // 401
{ error: "관리자 승인 대기 중입니다" }            // 403 (status='pending')
{ error: "차단된 계정입니다" }                   // 403 (status='blocked')
```

**로직**:
1. login_id + password 조회
2. status 확인 (active만 허용)
3. sessions에서 해당 user_id DELETE (기존 세션 삭제)
4. JWT 생성 (payload: { sub: user.id, role: user.role, deviceId: device_id })
5. sessions INSERT (user_id, device_id, token)
6. 응답

### 2.3 GET /api/auth/me

```ts
// Headers: Authorization: Bearer <JWT>

// Response 200
{ user: { id: number, name: string, role: string, status: string } }

// Error 401
{ error: "인증이 필요합니다" }      // JWT 없음/만료
{ error: "다른 기기에서 로그인됨" }  // 세션 불일치
```

**로직**:
1. JWT 검증 (서명 + 만료)
2. sessions에서 user_id로 조회 → token 일치 확인
3. 불일치 → 401 (다른 기기에서 로그인됨)
4. 일치 → users 정보 반환

### 2.4 POST /api/fcm/register

```ts
// Headers: Authorization: Bearer <JWT>
// Request
{ token: string, platform: "android" | "web" }

// Response 200
{ ok: true }
```

**로직**:
1. JWT 인증
2. fcm_tokens UPSERT (user_id + token)

### 2.5 GET /api/admin/users (관리자 전용)

```ts
// Headers: Authorization: Bearer <JWT> (role='admin')

// Response 200
{ users: Array<{ id, login_id, password, name, phone, email, company, region, role, status, created_at }> }
```

### 2.6 PATCH /api/admin/users/[id] (관리자 전용)

```ts
// Request
{ status: "active" | "blocked" }

// Response 200
{ ok: true, user: { id, status } }
```

### 2.7 POST /api/admin/push (관리자 전용)

```ts
// Request
{ title: string, body: string }

// Response 200
{ sent: number, failed: number }
```

**로직**:
1. fcm_tokens에서 전체 토큰 조회
2. Firebase HTTP v1 API로 각 토큰에 발송
3. 결과 집계

## 3. 파일별 구현 명세

### 3.1 src/lib/supabase.ts

```ts
import { createClient } from "@supabase/supabase-js";

// 서버용 (Service Role Key — API Route에서 사용)
export function createServerClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// 클라이언트용 (Anon Key — 사용하지 않지만 필요시)
export function createBrowserClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

### 3.2 src/lib/auth.ts

```ts
import { SignJWT, jwtVerify } from "jose";

const secret = () => new TextEncoder().encode(process.env.AUTH_JWT_SECRET!);

export async function signToken(payload: { sub: number; role: string; deviceId: string }) {
  return new SignJWT({ role: payload.role, deviceId: payload.deviceId })
    .setSubject(String(payload.sub))
    .setIssuedAt()
    .setExpirationTime("90d")
    .setProtectedHeader({ alg: "HS256" })
    .sign(secret());
}

export async function verifyToken(token: string) {
  const { payload } = await jwtVerify(token, secret());
  return {
    userId: Number(payload.sub),
    role: payload.role as string,
    deviceId: payload.deviceId as string,
  };
}
```

### 3.3 src/lib/device-id.ts

```ts
import { Capacitor } from "@capacitor/core";
import { Device } from "@capacitor/device";

export async function getDeviceId(): Promise<string> {
  if (Capacitor.isNativePlatform()) {
    const info = await Device.getId();
    return info.identifier;  // Android ID (공장초기화 전까지 유지)
  }
  // 웹 fallback: localStorage 기반 UUID
  let id = localStorage.getItem("device_id");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("device_id", id);
  }
  return id;
}
```

### 3.4 src/lib/api-guard.ts (교체)

기존 APP_API_TOKEN 방식 → JWT 인증으로 교체.

```ts
import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "./auth";
import { createServerClient } from "./supabase";

export async function checkAuth(req: NextRequest): Promise<
  { userId: number; role: string; deviceId: string } | NextResponse
> {
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token) {
    return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
  }
  try {
    const payload = await verifyToken(token);
    // 세션 유효성 확인 (단일 세션 강제)
    const sb = createServerClient();
    const { data: session } = await sb
      .from("sessions")
      .select("token")
      .eq("user_id", payload.userId)
      .single();
    if (!session || session.token !== token) {
      return NextResponse.json({ error: "다른 기기에서 로그인됨" }, { status: 401 });
    }
    return payload;
  } catch {
    return NextResponse.json({ error: "인증이 만료되었습니다" }, { status: 401 });
  }
}

export function checkAdmin(auth: { role: string } | NextResponse): NextResponse | null {
  if (auth instanceof NextResponse) return auth;
  if (auth.role !== "admin") {
    return NextResponse.json({ error: "관리자 권한이 필요합니다" }, { status: 403 });
  }
  return null;
}

// checkRateLimit은 기존 유지
```

### 3.5 src/lib/api-client.ts (교체)

```ts
"use client";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "";
const TOKEN_KEY = "auth_token";

export function apiUrl(path: string): string {
  return `${API_BASE}${path}`;
}

export function saveToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export function authHeaders(): HeadersInit {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  const token = getToken();
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}
```

### 3.6 src/app/api/render/route.ts (수정)

checkAuth 호출부만 변경:
```ts
// 기존
const authErr = checkAuth(req);
if (authErr) return withCors(authErr);

// 변경
const auth = await checkAuth(req);
if (auth instanceof NextResponse) return withCors(auth);
// auth = { userId, role, deviceId }
```

## 4. UI 설계

### 4.1 로그인 (/login)

```
┌─────────────────────────┐
│       화담 로그인        │
│                         │
│  아이디  [____________] │
│  비밀번호 [____________] │
│                         │
│  [      로그인       ]  │
│                         │
│  계정이 없으신가요?      │
│  [회원가입]              │
└─────────────────────────┘
```

### 4.2 회원가입 (/signup)

```
┌─────────────────────────┐
│       회원가입           │
│                         │
│  아이디*  [___________] │
│  비밀번호* [___________] │
│  이름*   [___________]  │
│  전화번호* [___________] │
│  이메일*  [___________]  │
│  상호명   [___________]  │ ← 선택
│  지역*   [▼ 선택 ____]  │
│                         │
│  [     가입하기      ]  │
│                         │
│  이미 계정이 있으신가요?  │
│  [로그인]               │
└─────────────────────────┘
```

**지역 선택지**: 서울, 경기, 인천, 부산, 대구, 대전, 광주, 울산, 세종, 강원, 충북, 충남, 전북, 전남, 경북, 경남, 제주

### 4.3 관리자 - 회원 목록 (/admin)

```
┌──────────────────────────────────────────────────────────────────┐
│  회원 관리                                        [푸시 발송]   │
├────┬────────┬──────┬──────┬───────────┬──────┬──────┬──────┬────┤
│ # │ 아이디 │ 비번 │ 이름 │ 전화번호  │이메일│상호명│ 지역 │상태│
├────┼────────┼──────┼──────┼───────────┼──────┼──────┼──────┼────┤
│ 1  │ user1  │ 1234 │ 홍길동│010-1234..│h@..  │화담  │ 서울 │[승인]│
│ 2  │ user2  │ abcd │ 김철수│010-5678..│k@..  │     │ 경기 │활성 │
│ 3  │ user3  │ qwer │ 이영희│010-9012..│l@..  │디자인│ 부산 │[차단]│
└────┴────────┴──────┴──────┴───────────┴──────┴──────┴──────┴────┘
```

### 4.4 관리자 - 푸시 발송 (/admin/push)

```
┌─────────────────────────┐
│      FCM 푸시 발송       │
│                         │
│  제목  [______________] │
│  내용  [______________] │
│        [______________] │
│                         │
│  [     전체 발송     ]  │
│                         │
│  등록된 기기: 127대      │
└─────────────────────────┘
```

## 5. 인증 가드 (Layout)

`src/app/layout.tsx`에 클라이언트 래퍼 추가:

```tsx
// src/components/AuthGuard.tsx
"use client";

function AuthGuard({ children }: { children: React.ReactNode }) {
  // 1. /login, /signup 경로 → 그대로 렌더
  // 2. getToken() 없음 → /login으로 리다이렉트
  // 3. getToken() 있음 → GET /api/auth/me 호출
  //    - 401 → clearToken() + /login으로
  //    - 200 → children 렌더
}
```

## 6. FCM 설정 (Android)

### capacitor.config.ts 추가

```ts
plugins: {
  PushNotifications: {
    presentationOptions: ["badge", "sound", "alert"],
  },
}
```

### android/app/build.gradle

```gradle
dependencies {
  implementation platform('com.google.firebase:firebase-bom:33.8.0')
  implementation 'com.google.firebase:firebase-messaging'
}
apply plugin: 'com.google.gms.google-services'
```

### FCM 토큰 등록 흐름

```ts
// 로그인 성공 후 호출
import { PushNotifications } from "@capacitor/push-notifications";

async function registerFCM() {
  const perm = await PushNotifications.requestPermissions();
  if (perm.receive !== "granted") return;
  await PushNotifications.register();
  PushNotifications.addListener("registration", async (token) => {
    await fetch(apiUrl("/api/fcm/register"), {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ token: token.value, platform: "android" }),
    });
  });
}
```

## 7. FCM 발송 (서버)

Firebase HTTP v1 API 사용 (Supabase Edge Function 불필요, Vercel API Route로 처리):

```ts
// POST /api/admin/push
// Firebase Admin SDK 대신 HTTP v1 API 직접 호출
// 필요 환경변수: FIREBASE_PROJECT_ID, FIREBASE_SERVICE_ACCOUNT_JSON

async function sendFCM(token: string, title: string, body: string) {
  const accessToken = await getFirebaseAccessToken(); // service account JWT → OAuth token
  await fetch(
    `https://fcm.googleapis.com/v1/projects/${PROJECT_ID}/messages:send`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        message: { token, notification: { title, body } },
      }),
    }
  );
}
```

## 8. 구현 순서 (Design 기준)

| 순서 | 파일 | 의존성 |
|:----:|------|--------|
| 1 | Supabase 테이블 생성 (SQL) | 없음 |
| 2 | `src/lib/supabase.ts` | 환경변수 |
| 3 | `src/lib/auth.ts` | jose |
| 4 | `src/lib/device-id.ts` | @capacitor/device |
| 5 | `src/lib/api-client.ts` 교체 | 없음 |
| 6 | `src/lib/api-guard.ts` 교체 | 2, 3 |
| 7 | `POST /api/auth/signup` | 2 |
| 8 | `POST /api/auth/login` | 2, 3 |
| 9 | `GET /api/auth/me` | 2, 3 |
| 10 | `src/app/api/render/route.ts` 수정 | 6 |
| 11 | `src/app/login/page.tsx` | 5 |
| 12 | `src/app/signup/page.tsx` | 5 |
| 13 | `src/components/AuthGuard.tsx` | 5 |
| 14 | `GET /api/admin/users` | 6 |
| 15 | `PATCH /api/admin/users/[id]` | 6 |
| 16 | `src/app/admin/page.tsx` | 14, 15 |
| 17 | `POST /api/fcm/register` | 6 |
| 18 | `POST /api/admin/push` | 6, Firebase |
| 19 | `src/app/admin/push/page.tsx` | 18 |
| 20 | FCM 토큰 등록 로직 (앱) | 17, @capacitor/push-notifications |
