-- 사용자 테이블
CREATE TABLE "partiApp_users" (
  id SERIAL PRIMARY KEY,
  login_id VARCHAR(50) UNIQUE NOT NULL,
  password VARCHAR(100) NOT NULL,
  name VARCHAR(50) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  email VARCHAR(100) NOT NULL,
  company VARCHAR(100),
  region VARCHAR(50) NOT NULL,
  role VARCHAR(10) NOT NULL DEFAULT 'user',
  status VARCHAR(10) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 세션 테이블 (1 user = 1 session)
CREATE TABLE "partiApp_sessions" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id INT NOT NULL REFERENCES "partiApp_users"(id) ON DELETE CASCADE,
  device_id VARCHAR(100) NOT NULL,
  token TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- FCM 토큰 테이블
CREATE TABLE "partiApp_fcm_tokens" (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES "partiApp_users"(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  platform VARCHAR(10) NOT NULL DEFAULT 'android',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 인덱스
CREATE INDEX idx_partiApp_sessions_user_id ON "partiApp_sessions"(user_id);
CREATE INDEX idx_partiApp_fcm_tokens_user_id ON "partiApp_fcm_tokens"(user_id);
CREATE INDEX idx_partiApp_users_login_id ON "partiApp_users"(login_id);
CREATE INDEX idx_partiApp_users_status ON "partiApp_users"(status);
