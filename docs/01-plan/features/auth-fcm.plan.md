# 회원가입/로그인 + 단일세션 + FCM 푸시

> **상태**: 계획 완료
> **작성일**: 2026-04-12
> **기존 계획**: `license-system-plan.md` (라이선스 키 방식) → 본 계획으로 대체

## 배경 / 목적

1. **1인 1카피 제한**: 로그인 기반 단일 세션으로 동시 사용 차단
2. **사용자 관리**: 관리자가 회원 정보를 확인/관리
3. **FCM 푸시**: 설치된 사용자에게 공지/알림 발송

## 아키텍처

```
┌──────────────────────────────────────────────────┐
│  Capacitor 앱 (화담)                               │
│  ┌──────────┐  ┌──────────┐  ┌────────────────┐  │
│  │ 회원가입  │  │ 로그인   │  │ FCM 토큰 등록  │  │
│  │ /signup  │  │ /login   │  │ (자동)         │  │
│  └────┬─────┘  └────┬─────┘  └───────┬────────┘  │
└───────┼─────────────┼────────────────┼───────────┘
        │             │                │
   ┌────▼─────────────▼────────────────▼───────────┐
   │              Supabase                          │
   │  ┌──────────┐  ┌───────────┐  ┌─────────────┐ │
   │  │ users    │  │ sessions  │  │ fcm_tokens  │ │
   │  │ 테이블   │  │ 테이블    │  │ 테이블      │ │
   │  └──────────┘  └───────────┘  └─────────────┘ │
   │                                                │
   │  ┌──────────────────────────────────────────┐  │
   │  │ Edge Function: send-push                 │  │
   │  │ (Firebase Admin SDK → FCM 발송)          │  │
   │  └──────────────────────────────────────────┘  │
   └────────────────────────────────────────────────┘
        │
   ┌────▼──────────────────────────────────────────┐
   │  관리자 페이지 (/admin)                         │
   │  - 회원 목록 (비번 포함)                        │
   │  - 승인/차단                                   │
   │  - FCM 푸시 발송                               │
   └───────────────────────────────────────────────┘
```

## 데이터 모델

### `users` 테이블

| 컬럼 | 타입 | 필수 | 설명 |
|------|------|:----:|------|
| id | serial (PK) | O | 순번 (자동 증가) |
| login_id | varchar(50) unique | O | 로그인 아이디 |
| password | varchar(100) | O | 비밀번호 (평문 저장 - 관리자 조회용) |
| name | varchar(50) | O | 이름 |
| phone | varchar(20) | O | 전화번호 |
| email | varchar(100) | O | 이메일 |
| company | varchar(100) | X | 상호명 (선택) |
| region | varchar(50) | O | 지역 |
| role | varchar(10) | O | 'user' / 'admin' (기본: 'user') |
| status | varchar(10) | O | 'pending' / 'active' / 'blocked' (기본: 'pending') |
| created_at | timestamptz | O | 가입일 |

> **비밀번호 평문 저장**: 사용자 요청에 의해 관리자 페이지에서 비밀번호를 직접 확인할 수 있도록 평문 저장. 내부 업무용 앱이므로 허용.

### `sessions` 테이블 (단일 세션 강제)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid (PK) | 세션 ID |
| user_id | int (FK → users.id) | 사용자 |
| device_id | varchar(100) | 기기 고유 ID |
| token | text | JWT 토큰 |
| created_at | timestamptz | 생성일 |

> 1 user = 1 session. 새 로그인 시 기존 세션 삭제 → 이전 기기 강제 로그아웃.

### `fcm_tokens` 테이블

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | serial (PK) | 순번 |
| user_id | int (FK → users.id) | 사용자 |
| token | text unique | FCM 토큰 |
| platform | varchar(10) | 'android' / 'web' |
| updated_at | timestamptz | 최종 갱신일 |

## 인증 흐름

### 회원가입
```
앱 → POST /api/auth/signup (body: login_id, password, name, phone, email, company?, region)
    → users 테이블에 INSERT (status: 'pending')
    → 응답: "가입 완료, 관리자 승인 대기"
```

### 로그인
```
앱 → POST /api/auth/login (body: login_id, password, device_id)
    → users에서 조회 + 비밀번호 확인
    → status 체크 ('active'만 허용)
    → sessions에서 기존 세션 DELETE (단일 세션 강제)
    → 새 세션 INSERT + JWT 발급
    → 응답: { jwt, user: { id, name, role } }
```

### 세션 체크 (앱 실행 시)
```
앱 시작 → 저장된 JWT로 GET /api/auth/me
    → JWT 검증 + sessions 테이블에서 유효성 확인
    → 유효: 사용자 정보 반환
    → 무효 (다른 기기에서 로그인됨): 401 → 로그인 화면으로
```

### 단일 세션 강제
```
사용자 A가 기기1에서 로그인 중
    → 기기2에서 같은 계정 로그인
    → sessions에서 기기1 세션 삭제
    → 기기1은 다음 API 호출 시 401 → 자동 로그아웃
```

## FCM 푸시 흐름

### 토큰 등록
```
로그인 성공 후 → @capacitor/push-notifications으로 FCM 토큰 수신
    → POST /api/fcm/register (body: token, platform)
    → fcm_tokens 테이블에 UPSERT
```

### 푸시 발송 (관리자)
```
관리자 페이지 → 메시지 작성 → POST /api/admin/push (body: title, body, target?)
    → Supabase Edge Function 호출
    → Firebase Admin SDK로 FCM 발송 (전체 또는 선택 사용자)
```

## 관리자 페이지 (/admin)

### 기능
1. **회원 목록**: 순번, 아이디, 비번, 이름, 전화번호, 이메일, 상호명, 지역, 상태
2. **승인/차단**: pending → active (승인), active → blocked (차단)
3. **FCM 푸시 발송**: 제목 + 내용 입력 → 전체 발송
4. **접근 제한**: role='admin'인 사용자만 접근 가능

### 관리자 계정
- 초기 admin 계정은 Supabase DB에 직접 INSERT로 생성
- 또는 첫 번째 가입자를 자동 admin으로 설정

## 구현 파일 목록

### 신규 파일
```
src/lib/supabase.ts                 # Supabase 클라이언트 (server/client)
src/lib/auth.ts                     # JWT 서명/검증, 세션 관리
src/lib/device-id.ts                # Capacitor Device로 기기 ID
src/app/signup/page.tsx             # 회원가입 화면
src/app/login/page.tsx              # 로그인 화면
src/app/admin/page.tsx              # 관리자 - 회원 목록
src/app/admin/push/page.tsx         # 관리자 - FCM 발송
src/app/api/auth/signup/route.ts    # 회원가입 API
src/app/api/auth/login/route.ts     # 로그인 API
src/app/api/auth/me/route.ts        # 세션 확인 API
src/app/api/fcm/register/route.ts   # FCM 토큰 등록 API
src/app/api/admin/users/route.ts    # 회원 목록 API (관리자)
src/app/api/admin/users/[id]/route.ts  # 회원 상태 변경 API
src/app/api/admin/push/route.ts     # FCM 발송 API (관리자)
supabase/migrations/001_init.sql    # 테이블 생성 SQL
```

### 수정 파일
```
src/lib/api-guard.ts        # JWT 기반 인증으로 교체
src/lib/api-client.ts       # JWT 저장/헤더 주입
src/app/layout.tsx           # 인증 상태 체크 → 미로그인 시 /login 리다이렉트
src/app/api/render/route.ts  # 새 인증 체크 적용
package.json                 # 의존성 추가
capacitor.config.ts          # (FCM 플러그인 설정 시)
```

## 필요한 패키지

```bash
npm install @supabase/supabase-js jose @capacitor/push-notifications @capacitor/device
```

| 패키지 | 용도 |
|--------|------|
| `@supabase/supabase-js` | Supabase DB 접근 |
| `jose` | JWT 서명/검증 (Edge 호환) |
| `@capacitor/push-notifications` | FCM 토큰 수신 |
| `@capacitor/device` | 기기 고유 ID |

## 환경 변수

```
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...          # 서버 전용
AUTH_JWT_SECRET=<64자 랜덤>               # openssl rand -base64 48
FIREBASE_SERVER_KEY=<FCM 서버 키>          # Edge Function용
```

## 구현 순서

### Phase 1: Supabase 테이블 + 인증 기본
- [ ] Supabase 프로젝트 생성 + 테이블 (users, sessions, fcm_tokens)
- [ ] `src/lib/supabase.ts` — 클라이언트 설정
- [ ] `src/lib/auth.ts` — JWT sign/verify
- [ ] `src/lib/device-id.ts` — 기기 ID 조회

### Phase 2: 회원가입 / 로그인
- [ ] `POST /api/auth/signup` — 회원가입
- [ ] `POST /api/auth/login` — 로그인 + 세션 생성 + JWT 발급
- [ ] `GET /api/auth/me` — 세션 확인
- [ ] `src/app/signup/page.tsx` — 회원가입 UI
- [ ] `src/app/login/page.tsx` — 로그인 UI
- [ ] `src/lib/api-guard.ts` — JWT 인증으로 교체
- [ ] `src/lib/api-client.ts` — JWT 저장/헤더 주입
- [ ] `src/app/layout.tsx` — 인증 가드 (미로그인 시 리다이렉트)

### Phase 3: 관리자 페이지
- [ ] `GET /api/admin/users` — 회원 목록 (비번 포함)
- [ ] `PATCH /api/admin/users/[id]` — 승인/차단
- [ ] `src/app/admin/page.tsx` — 회원 관리 UI

### Phase 4: FCM 푸시
- [ ] `@capacitor/push-notifications` 설정 (Android)
- [ ] `POST /api/fcm/register` — 토큰 등록
- [ ] Firebase 프로젝트 설정 + google-services.json
- [ ] `POST /api/admin/push` — 푸시 발송
- [ ] `src/app/admin/push/page.tsx` — 발송 UI

### Phase 5: 통합 검증
- [ ] 회원가입 → 관리자 승인 → 로그인 → 렌더링 흐름
- [ ] 다른 기기 로그인 시 이전 기기 강제 로그아웃
- [ ] FCM 토큰 등록 + 푸시 수신
- [ ] `npm run build` 타입 에러 없음

## 사용자 준비 사항

1. **Supabase 프로젝트 생성** → URL, Anon Key, Service Role Key 확보
2. **Firebase 프로젝트 생성** → `google-services.json` 다운로드 → `android/app/`에 배치
3. **환경 변수 설정** (Vercel + `.env.local`)

## 기존 라이선스 키 계획과의 관계

- `license-system-plan.md`의 라이선스 키 방식은 **본 계획으로 대체**
- 기존 `APP_API_TOKEN` 방식 → JWT 인증으로 교체
- Upstash Redis → Supabase DB로 변경
- 핵심 변경: 키 입력 → 아이디/비번 로그인

---

**재개 시**: 이 문서를 읽고 "구현 순서" Phase 1부터 순차 진행.
**선행 조건**: Supabase 프로젝트 + Firebase 프로젝트 생성 완료.
