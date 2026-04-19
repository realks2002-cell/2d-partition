-- 앱-웹 세션 핸드오프용 단일 사용 코드 테이블
-- 결제 성공 후 웹 → 앱 복귀 시, deep link URL에 장기 JWT 대신 이 코드를 실어 보냄.
-- 앱이 /api/auth/app-claim 로 코드를 제출해야 신규 JWT 발급.

CREATE TABLE IF NOT EXISTS "partiApp_auth_codes" (
  code TEXT PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES "partiApp_users"(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL,
  purpose TEXT NOT NULL CHECK (purpose IN ('app-handoff')),
  consumed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "partiApp_auth_codes_user_idx"
  ON "partiApp_auth_codes"(user_id);
CREATE INDEX IF NOT EXISTS "partiApp_auth_codes_expires_idx"
  ON "partiApp_auth_codes"(expires_at);
