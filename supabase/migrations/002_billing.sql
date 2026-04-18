-- 002_billing.sql
-- SaaS 결제/렌더링 횟수 시스템

-- 1) 사용자에 잔여 횟수/플랜/누적 사용량 컬럼 추가
ALTER TABLE "partiApp_users"
  ADD COLUMN IF NOT EXISTS render_quota INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS plan VARCHAR(20) NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS total_rendered INT NOT NULL DEFAULT 0;

-- 2) 횟수 변동 감사 로그 (충전/차감/환불/관리자 부여)
CREATE TABLE IF NOT EXISTS "partiApp_quota_logs" (
  id BIGSERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES "partiApp_users"(id) ON DELETE CASCADE,
  delta INT NOT NULL,                      -- + 충전, - 사용
  reason VARCHAR(30) NOT NULL,             -- signup_bonus / render / refund / purchase / admin_grant / admin_revoke
  balance_after INT NOT NULL,
  meta JSONB,                              -- {payment_id, mode, count, admin_id, note, ...}
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_quota_logs_user ON "partiApp_quota_logs"(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quota_logs_reason ON "partiApp_quota_logs"(reason);

-- 3) 결제 내역 (토스페이먼츠 단건결제 기준)
CREATE TABLE IF NOT EXISTS "partiApp_payments" (
  id BIGSERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES "partiApp_users"(id) ON DELETE RESTRICT,
  order_id VARCHAR(100) UNIQUE NOT NULL,        -- 자체 발급 (UUID)
  payment_key VARCHAR(200),                     -- 토스 paymentKey
  plan VARCHAR(20) NOT NULL,                    -- standard / pro / premium
  amount INT NOT NULL,                          -- 10000 / 30000 / 50000
  quota_granted INT NOT NULL,                   -- 30 / 115 / 200
  status VARCHAR(20) NOT NULL DEFAULT 'pending',-- pending / paid / failed / cancelled / refunded
  method VARCHAR(20),                           -- card / transfer / virtual_account / easy_pay
  receipt_url TEXT,
  raw JSONB,                                    -- 토스 응답 원본
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  paid_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_payments_user ON "partiApp_payments"(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_status ON "partiApp_payments"(status);
CREATE INDEX IF NOT EXISTS idx_payments_paid_at ON "partiApp_payments"(paid_at DESC) WHERE status = 'paid';

-- 4) 안전한 차감 RPC (음수 잔액 방지, 동시성 안전)
CREATE OR REPLACE FUNCTION consume_render_quota(p_user_id INT, p_amount INT)
RETURNS INT
LANGUAGE plpgsql
AS $$
DECLARE
  new_balance INT;
BEGIN
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'amount must be positive';
  END IF;

  UPDATE "partiApp_users"
  SET render_quota = render_quota - p_amount,
      total_rendered = total_rendered + p_amount
  WHERE id = p_user_id
    AND render_quota >= p_amount
  RETURNING render_quota INTO new_balance;

  IF new_balance IS NULL THEN
    RAISE EXCEPTION 'insufficient_quota' USING ERRCODE = 'P0001';
  END IF;

  RETURN new_balance;
END;
$$;

-- 5) 안전한 충전 RPC
CREATE OR REPLACE FUNCTION grant_render_quota(p_user_id INT, p_amount INT)
RETURNS INT
LANGUAGE plpgsql
AS $$
DECLARE
  new_balance INT;
BEGIN
  IF p_amount = 0 THEN
    RAISE EXCEPTION 'amount must be non-zero';
  END IF;

  UPDATE "partiApp_users"
  SET render_quota = GREATEST(render_quota + p_amount, 0)
  WHERE id = p_user_id
  RETURNING render_quota INTO new_balance;

  IF new_balance IS NULL THEN
    RAISE EXCEPTION 'user_not_found';
  END IF;

  RETURN new_balance;
END;
$$;

-- 6) 기존 사용자에게 무료 5회 백필 (한 번만)
DO $$
DECLARE
  u RECORD;
  bal INT;
BEGIN
  FOR u IN
    SELECT id FROM "partiApp_users"
    WHERE NOT EXISTS (
      SELECT 1 FROM "partiApp_quota_logs"
      WHERE user_id = "partiApp_users".id AND reason = 'signup_bonus'
    )
  LOOP
    bal := grant_render_quota(u.id, 5);
    INSERT INTO "partiApp_quota_logs"(user_id, delta, reason, balance_after, meta)
    VALUES (u.id, 5, 'signup_bonus', bal, '{"backfill": true}'::jsonb);
  END LOOP;
END $$;
