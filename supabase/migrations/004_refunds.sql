-- 004_refunds.sql
-- 환불 기능 (전액 + 부분환불)

-- 1) partiApp_payments에 환불 집계 컬럼 추가
ALTER TABLE "partiApp_payments"
  ADD COLUMN IF NOT EXISTS refunded_amount INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS refunded_quota INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS refund_reason TEXT,
  ADD COLUMN IF NOT EXISTS last_refunded_at TIMESTAMPTZ;

-- 2) 환불 이력 (부분환불 여러 번 가능)
CREATE TABLE IF NOT EXISTS "partiApp_refunds" (
  id BIGSERIAL PRIMARY KEY,
  payment_id BIGINT NOT NULL REFERENCES "partiApp_payments"(id) ON DELETE RESTRICT,
  user_id INT NOT NULL REFERENCES "partiApp_users"(id),
  amount INT NOT NULL CHECK (amount > 0),
  quota_revoked INT NOT NULL DEFAULT 0,
  reason VARCHAR(50) NOT NULL,
  note TEXT,
  toss_transaction_key VARCHAR(200),
  toss_response JSONB,
  admin_id INT REFERENCES "partiApp_users"(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_refunds_payment ON "partiApp_refunds"(payment_id);
CREATE INDEX IF NOT EXISTS idx_refunds_user ON "partiApp_refunds"(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_refunds_created ON "partiApp_refunds"(created_at DESC);
