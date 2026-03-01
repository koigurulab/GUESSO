-- ============================================================
-- LINE認証 + フェチテーマ マイグレーション
-- Supabase SQL Editor で実行してください
-- ============================================================

-- 1. rooms テーブルに LINE認証カラムを追加
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS line_verified    BOOLEAN DEFAULT false;
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS line_verify_code TEXT;

-- 確認コードで高速検索するためのインデックス
CREATE INDEX IF NOT EXISTS idx_rooms_line_verify_code
  ON rooms(line_verify_code)
  WHERE line_verify_code IS NOT NULL;

-- 2. themes テーブルの category チェック制約を更新（'fetish' を追加）
ALTER TABLE themes DROP CONSTRAINT IF EXISTS themes_category_check;
ALTER TABLE themes ADD CONSTRAINT themes_category_check
  CHECK (category IN ('love', 'life', 'light', 'custom', 'fetish'));

-- 3. フェチテーマを themes テーブルに挿入
INSERT INTO themes (id, title, emoji, category, items, is_free) VALUES
(
  'fetish-female',
  '理解できるフェチ（女性）',
  '💜',
  'fetish',
  '[
    {"id":"nape",       "emoji":"✨", "label":"うなじ"},
    {"id":"collarbone", "emoji":"💜", "label":"鎖骨"},
    {"id":"armpit",     "emoji":"🌸", "label":"わき"},
    {"id":"thigh",      "emoji":"🌙", "label":"太もも"},
    {"id":"hand",       "emoji":"🤍", "label":"手"},
    {"id":"butt",       "emoji":"🍑", "label":"おしり"},
    {"id":"chest",      "emoji":"💗", "label":"胸"}
  ]'::jsonb,
  false
),
(
  'fetish-male',
  '理解できるフェチ（男性）',
  '💙',
  'fetish',
  '[
    {"id":"hand",       "emoji":"✋", "label":"手"},
    {"id":"vein",       "emoji":"💪", "label":"血管"},
    {"id":"shoulder",   "emoji":"🏔", "label":"肩幅"},
    {"id":"pectoral",   "emoji":"🦾", "label":"胸筋"},
    {"id":"adams",      "emoji":"🔥", "label":"のどぼとけ"},
    {"id":"collarbone", "emoji":"⚡", "label":"鎖骨"},
    {"id":"calf",       "emoji":"🦵", "label":"ふくらはぎ"}
  ]'::jsonb,
  false
)
ON CONFLICT (id) DO NOTHING;
