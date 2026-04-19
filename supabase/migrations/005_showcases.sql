-- 005_showcases.sql
-- 랜딩페이지 Featured + Showcases CMS

CREATE TABLE IF NOT EXISTS "partiApp_showcases" (
  id SERIAL PRIMARY KEY,
  title VARCHAR(100) NOT NULL,
  subtitle VARCHAR(100),
  description TEXT,
  category VARCHAR(20) NOT NULL DEFAULT 'all',
  palette VARCHAR(20) NOT NULL DEFAULT 'neutral',
  image_url TEXT,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  order_index INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_showcases_active_order ON "partiApp_showcases"(is_active, order_index);
CREATE INDEX IF NOT EXISTS idx_showcases_featured ON "partiApp_showcases"(is_featured) WHERE is_featured = true;

-- Seed 데이터 (한 번만)
INSERT INTO "partiApp_showcases" (title, subtitle, description, category, palette, is_featured, order_index)
SELECT * FROM (VALUES
  ('Sample · Apartment', 'CASE · 001', '판교 42평 상가 파티션 리모델링 — ㄴ형 코너 구조 + 다크 프레임 + 투명 도어 3개. 사진 업로드 후 47초 만에 완성된 렌더링입니다.', 'all', 'terracotta', true, 0),
  ('강남 사무실 · 12칸 직선', NULL, NULL, '사무실', 'neutral', false, 1),
  ('역삼 카페 · ㄴ형 코너', NULL, NULL, '카페', 'terracotta', false, 2),
  ('판교 스튜디오 · 단층 6칸', NULL, NULL, '사무실', 'espresso', false, 3),
  ('성수 상가 · 도어 2개', NULL, NULL, '상가', 'sage', false, 4),
  ('홍대 매장 · 2D 코너', NULL, NULL, '상가', 'sand', false, 5),
  ('잠실 오피스 · 3단 프레임', NULL, NULL, '사무실', 'graphite', false, 6)
) AS seed(title, subtitle, description, category, palette, is_featured, order_index)
WHERE NOT EXISTS (SELECT 1 FROM "partiApp_showcases" LIMIT 1);
