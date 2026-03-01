-- ============================================================
-- 人ランキングモード マイグレーション
-- Supabase SQL Editor で実行してください
-- ============================================================

-- rounds テーブルに人ランキング用カラムを追加
ALTER TABLE rounds ADD COLUMN IF NOT EXISTS is_person_rank  BOOLEAN DEFAULT false;
ALTER TABLE rounds ADD COLUMN IF NOT EXISTS target_player_ids JSONB;   -- string[] 対象プレイヤーID配列
ALTER TABLE rounds ADD COLUMN IF NOT EXISTS rank_sequence     JSONB;   -- number[] 予想する順位配列 e.g.[1,2,4]
