# 라이선스 키 시스템 구현 계획

> **상태**: 미착수 (다음 작업으로 예정)
> **작성일**: 2026-04-11
> **예상 작업 시간**: 코드 작업 1.5시간 + 사용자 세팅 15분 = **~2시간**

## 배경 / 문제

APK를 카피로 판매할 때 **판매처가 복제해서 재판매하는 것**을 막아야 함.

### 위협 모델 (Threat Model)
- **대응**: 판매처가 APK 파일을 그대로 복사해서 여러 구매자에게 배포하는 시나리오
- **무시**: 전문 해커가 APK를 뜯어서 검증 코드를 패치하는 시나리오
- 해커 대응을 빼므로 ProGuard/난독화/서명검증/Play Integrity 등 불필요 → **구현 단순화**

### 핵심 원리
> **"복제된 APK는 서버의 허락 없이 작동 불가"**
> AI 렌더링이 이미 Vercel 서버(`/api/render`)에서 실행되므로, 서버에 "이 APK는 정식 라이선스"를 증명해야만 렌더링이 돌아감.

## 아키텍처

```
┌─────────────┐     ①키+기기ID     ┌─────────────────┐     ②DB조회      ┌──────────┐
│   APK       │ ──────────────────▶ │  Vercel Server  │ ───────────────▶ │  Redis   │
│             │                     │                 │                   │(Upstash) │
│  [첫실행]   │ ◀────────────────── │  /api/activate  │ ◀─────────────── │          │
│  키 입력    │     ③JWT 발급       │                 │     키 상태      └──────────┘
│             │                     │                 │
│  [이후]     │ ──JWT+기기ID 포함── │  /api/render    │
│  렌더링 요청│                     │                 │
│             │ ◀────렌더 결과───── │                 │
└─────────────┘                     └─────────────────┘
```

## 데이터 모델

### Redis 키: `license:{key}`
```ts
{
  key: string;              // 예: "HWDM-XXXX-YYYY-ZZZZ"
  status: "unused" | "active" | "revoked";
  deviceId: string | null;  // Android ID, 활성화 시 기록
  activatedAt: number | null;
  lastUsedAt: number | null;
  renderCount: number;      // 누적 렌더 횟수
  monthRenderCount: number; // 이번 달 렌더 횟수 (월초 리셋)
  monthKey: string;         // "2026-04" (월 리셋 기준)
  notes?: string;           // 구매자 이메일 등
  createdAt: number;
}
```

### JWT payload
```ts
{
  sub: licenseKey,
  deviceId: string,
  iat: number,
  exp: number,  // iat + 90일
}
```

## MVP 정책 (기본값)

| 항목 | 설정 |
|------|------|
| 라이선스 수명 | **평생** (만료 없음) |
| 1키당 기기 수 | **1대** (재등록 불가, 기기 교체 시 수동 처리) |
| 일 렌더 제한 | **20회** |
| 월 렌더 제한 | **300회** |
| JWT 유효기간 | **90일** (자동 갱신: 활성 키면 `/api/render` 호출 시 새 JWT 리턴) |
| 키 발급 방식 | **CLI 스크립트** (수동) |
| DB | **Upstash Redis** (Vercel Marketplace 무료 플랜) |

## 구현 파일 목록

### 신규 파일
```
src/lib/license.ts              # Redis 헬퍼 (CRUD)
src/lib/jwt.ts                  # JWT 서명/검증 유틸
src/lib/device-id.ts            # Capacitor Device로 기기 ID 조회
src/app/api/activate/route.ts   # /api/activate 엔드포인트
src/app/activate/page.tsx       # 라이선스 키 입력 화면
scripts/issue-license.mjs       # 키 발급 CLI
scripts/list-licenses.mjs       # 키 조회 CLI (선택)
scripts/revoke-license.mjs      # 키 비활성화 CLI (선택)
```

### 수정 파일
```
src/lib/api-guard.ts            # 토큰 검증 → JWT 검증으로 교체
src/app/api/render/route.ts     # 인증 시 JWT + deviceId 대조
src/lib/api-client.ts           # JWT 저장/읽기/헤더 주입
src/lib/store.ts                # 라이선스 상태 필드 추가 (활성화 여부 캐시)
src/app/layout.tsx              # 첫 진입 시 활성화 여부 체크 → /activate 리다이렉트
package.json                    # 의존성 추가
.env.local (사용자)              # LICENSE_JWT_SECRET, UPSTASH_REDIS_* 추가
```

## 필요한 패키지

```bash
npm install jose @upstash/redis @capacitor/device
```

- `jose` — JWT 서명·검증 (표준, 에지 런타임 호환)
- `@upstash/redis` — 서버리스 친화적 Redis 클라이언트
- `@capacitor/device` — 기기 고유 ID 조회 (Android ID 등)

## 환경 변수 (Vercel)

```
LICENSE_JWT_SECRET=<64자 랜덤 문자열>     # openssl rand -base64 48
UPSTASH_REDIS_REST_URL=https://...        # Vercel Marketplace 자동 주입
UPSTASH_REDIS_REST_TOKEN=AX...            # Vercel Marketplace 자동 주입
```

기존 `APP_API_TOKEN`, `NEXT_PUBLIC_APP_API_TOKEN`은 제거.

## 구현 순서 (체크리스트)

### 백엔드
- [ ] `npm install jose @upstash/redis @capacitor/device`
- [ ] `src/lib/jwt.ts` — sign/verify 함수
- [ ] `src/lib/license.ts` — Upstash Redis로 라이선스 CRUD
- [ ] `src/app/api/activate/route.ts` — 키 등록 + JWT 발급
  - Body: `{ key, deviceId }`
  - Response: `{ jwt, expiresAt }` 또는 에러
  - 로직: 키 조회 → status 체크 → 기기 바인딩 → JWT 발급
- [ ] `src/lib/api-guard.ts` — `checkLicense(req)` 함수
  - Authorization 헤더에서 JWT 파싱
  - 검증 + deviceId 대조
  - Rate limit: 일 20회 / 월 300회
  - 매 호출 시 `renderCount`, `monthRenderCount` 증가
- [ ] `src/app/api/render/route.ts` — `checkLicense` 호출로 교체

### 프론트엔드
- [ ] `src/lib/device-id.ts` — Capacitor Device + 웹 fallback
- [ ] `src/lib/api-client.ts` — JWT 저장/읽기 (Preferences on native, localStorage on web)
- [ ] `src/app/activate/page.tsx` — 입력 화면
  - 라이선스 키 입력 필드
  - "활성화" 버튼 → `/api/activate` 호출
  - 성공 시 JWT 저장 + 홈으로
  - 실패 시 에러 메시지 (이미 사용된 키 / 없는 키 등)
- [ ] `src/app/layout.tsx` 또는 `src/app/page.tsx` — 첫 진입 시 JWT 체크
  - JWT 없으면 `/activate`로 리다이렉트
  - JWT 만료 임박 시 자동 갱신

### 키 발급 도구
- [ ] `scripts/issue-license.mjs`
  - 사용법: `node scripts/issue-license.mjs [개수] [--note="고객명"]`
  - 동작: 랜덤 키 생성 → Redis에 저장 → 콘솔에 출력
- [ ] (선택) `scripts/list-licenses.mjs` — 전체 키 조회
- [ ] (선택) `scripts/revoke-license.mjs [key]` — 키 비활성화

### 검증
- [ ] `npm run build` — 타입 에러 없음
- [ ] 로컬 테스트:
  - 키 발급 → 활성화 → 렌더링 성공
  - 같은 키 다른 deviceId로 활성화 시도 → 차단
  - JWT 없이 렌더링 시도 → 401
  - Rate limit 초과 시 429
- [ ] Vercel 배포 후 실기기 테스트

## 사용자 측 준비 사항

구현 완료 후 사용자(판매자)가 해야 할 일:

1. **Upstash Redis 생성** (5분)
   - Vercel Dashboard → Storage → Browse Marketplace → Upstash Redis → Create
   - 프로젝트에 연결 시 `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` 자동 주입

2. **JWT Secret 생성** (2분)
   ```bash
   openssl rand -base64 48
   ```
   Vercel Dashboard → Settings → Environment Variables → `LICENSE_JWT_SECRET` 추가

3. **재배포** (2분)
   ```bash
   vercel deploy --prod
   ```

4. **첫 라이선스 키 발급** (1분)
   ```bash
   node scripts/issue-license.mjs 3 --note="첫 판매처"
   ```

5. **APK 빌드 + 테스트** (15분)
   - `npm run sync:android`
   - Android Studio에서 APK 빌드
   - 실기기 설치 → 키 입력 → 렌더링 확인

## API 명세

### POST /api/activate
**Request**:
```json
{
  "key": "HWDM-ABCD-EFGH-IJKL",
  "deviceId": "android-id-xxxxx"
}
```

**Response (성공)**:
```json
{
  "jwt": "eyJhbGciOi...",
  "expiresAt": 1743350400000
}
```

**Response (실패)**:
```json
{ "error": "License key not found" }              // 404
{ "error": "License already activated on another device" }  // 409
{ "error": "License revoked" }                    // 403
```

### POST /api/render
**Headers**:
```
Authorization: Bearer <JWT>
X-Device-Id: <current device id>
```

서버는 JWT 검증 후:
- `JWT.deviceId === X-Device-Id` 확인
- Redis에서 `license:{JWT.sub}.deviceId === JWT.deviceId` 확인
- Rate limit 확인
- 렌더링 수행

## 리스크 / 고려사항

1. **기기 교체 시 대응**
   - MVP에서는 수동 처리 (구매자가 판매자에게 연락 → 판매자가 `revoke-license.mjs` + 새 키 발급)
   - 향후 `/api/reset-device` 엔드포인트로 자동화 가능

2. **오프라인 사용**
   - JWT 유효기간 90일 동안은 서버 없어도 캐시된 JWT 사용 가능? ❌ 아님. 렌더링 자체가 서버 필요하므로 오프라인 자체가 불가능.
   - 단, 활성화 후 캐시된 결과물은 언제든 조회 가능 (이미 `idb-keyval`로 저장됨)

3. **Android ID 변경 가능성**
   - 공장 초기화 시 Android ID가 바뀔 수 있음
   - 이 경우 구매자가 앱을 재활성화해야 함 → 판매자 문의 필요
   - 대안: Capacitor Device의 `uuid`를 쓰면 앱 재설치 시 변경됨 → 더 엄격
   - **권장**: Android ID 사용 (재설치에도 유지)

4. **Upstash Free Tier 한계**
   - 10,000 requests/day (무료)
   - 초과 시 유료 전환 필요
   - 캐시 전략: JWT 유효기간 내에는 서버에서 매번 Redis 조회하지 말고 JWT 검증만 해도 됨 (렌더 카운트는 집계만)

## 참고

- Upstash Redis: https://upstash.com/docs/redis/overall/getstarted
- jose (JWT): https://github.com/panva/jose
- Capacitor Device: https://capacitorjs.com/docs/apis/device
- Vercel Marketplace: https://vercel.com/marketplace

---

**재개 시 체크**: 이 문서를 읽고 "구현 순서 (체크리스트)" 부터 순차적으로 진행. 사전에 Upstash Redis 계정이 준비돼 있으면 더 빠름.
