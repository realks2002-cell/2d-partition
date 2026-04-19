-- partiApp_auth_codes: 활성 코드 1개 제약 + 만료 GC
-- 동일 사용자+purpose 조합으로 "미소비(NULL)" 코드가 여러 개 생기는 것을 방지.

CREATE UNIQUE INDEX IF NOT EXISTS "partiApp_auth_codes_active_uq"
  ON "partiApp_auth_codes"(user_id, purpose)
  WHERE consumed_at IS NULL;

-- 만료 코드 자동 정리 (24시간 이상 지난 row 제거)
-- pg_cron이 설정되어 있으면 아래 줄 주석 해제 후 실행:
--   SELECT cron.schedule('gc_auth_codes', '0 * * * *',
--     $$DELETE FROM "partiApp_auth_codes" WHERE expires_at < now() - interval '1 day'$$);
