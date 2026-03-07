-- ============================================================
-- 人ランキングモード マイグレーション
-- Supabase SQL Editor で実行してください
-- ============================================================

-- rounds テーブルに人ランキング用カラムを追加
ALTER TABLE rounds ADD COLUMN IF NOT EXISTS is_person_rank  BOOLEAN DEFAULT false;
ALTER TABLE rounds ADD COLUMN IF NOT EXISTS target_player_ids JSONB;   -- string[] 対象プレイヤーID配列
ALTER TABLE rounds ADD COLUMN IF NOT EXISTS rank_sequence     JSONB;   -- number[] 予想する順位配列 e.g.[1,2,4]

-- themes テーブルの category チェック制約に 'person-rank' を追加
ALTER TABLE themes DROP CONSTRAINT IF EXISTS themes_category_check;
ALTER TABLE themes ADD CONSTRAINT themes_category_check
  CHECK (category IN ('love', 'life', 'light', 'custom', 'fetish', 'person-rank'));

-- 人ランキングテーマを themes テーブルに挿入
-- ※ themes.ts に新テーマを追加したら、ここにも INSERT を追加すること
INSERT INTO themes (id, title, emoji, category, items, is_free) VALUES
  ('pr-type',       '一番タイプな人は？',                 '💘', 'person-rank', '[]'::jsonb, false),
  ('pr-popular',    '一番モテそうなのは誰？',             '🌟', 'person-rank', '[]'::jsonb, false),
  ('pr-kiss',       'キスが上手そうなのは誰？',           '💋', 'person-rank', '[]'::jsonb, false),
  ('pr-clingy',     '付き合ったら束縛しそうなのは誰？',   '🔒', 'person-rank', '[]'::jsonb, false),
  ('pr-charisma',   '一番色気あるのは誰？',               '✨', 'person-rank', '[]'::jsonb, false),
  ('pr-night',      '夜が強そうなのは誰？',               '🌙', 'person-rank', '[]'::jsonb, false),
  ('pr-erotic',     '正直エロそうなのは誰？',             '🔥', 'person-rank', '[]'::jsonb, false),
  ('pr-ds',         '一番ドSそうなのは誰？',              '😈', 'person-rank', '[]'::jsonb, false),
  ('pr-count',      '1番経験人数が多そうなのは誰？',      '🔢', 'person-rank', '[]'::jsonb, false),
  ('pr-cheat',      '浮気しそうなのは誰？',               '💔', 'person-rank', '[]'::jsonb, false),
  ('pr-drunk',      '酔ったら面倒くさそうなのは誰？',     '🍺', 'person-rank', '[]'::jsonb, false),
  ('pr-selfish',    '一番ワガママそうなのは誰？',         '👑', 'person-rank', '[]'::jsonb, false),
  ('pr-heartbreak', '失恋したら一番引きずりそうなのは誰？','😢', 'person-rank', '[]'::jsonb, false)
ON CONFLICT (id) DO NOTHING;
