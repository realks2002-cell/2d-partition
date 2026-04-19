-- 003_admin_seed.sql
-- 기본 관리자 계정 생성: admin / admin123

INSERT INTO "partiApp_users"
  (login_id, password, name, phone, email, region, role, status, render_quota, plan)
VALUES
  ('admin', 'admin123', '관리자', '000-0000-0000', 'admin@example.com', '서울', 'admin', 'active', 9999, 'premium')
ON CONFLICT (login_id) DO UPDATE SET
  password = EXCLUDED.password,
  role = EXCLUDED.role,
  status = EXCLUDED.status,
  render_quota = GREATEST("partiApp_users".render_quota, 9999);

-- signup_bonus 로그 추가 (quota_logs 무결성을 위해)
INSERT INTO "partiApp_quota_logs" (user_id, delta, reason, balance_after, meta)
SELECT id, 9999, 'admin_grant', render_quota, '{"note": "seed admin account"}'::jsonb
FROM "partiApp_users"
WHERE login_id = 'admin'
  AND NOT EXISTS (
    SELECT 1 FROM "partiApp_quota_logs"
    WHERE user_id = "partiApp_users".id AND reason = 'admin_grant'
  );
