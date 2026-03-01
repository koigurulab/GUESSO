-- GUESSO: 飲み会向け価値観推理ゲーム
-- Supabase (PostgreSQL) Schema

-- UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ======================
-- THEMES
-- テーマ定義（items は [{id, emoji, label}] の JSON配列 x 7）
-- ======================
CREATE TABLE themes (
  id         TEXT PRIMARY KEY,
  title      TEXT NOT NULL,
  emoji      TEXT NOT NULL,
  category   TEXT NOT NULL CHECK (category IN ('love', 'life', 'light', 'custom')),
  items      JSONB NOT NULL,   -- [{id:string, emoji:string, label:string}] x 7
  is_free    BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ======================
-- ROOMS
-- ルーム (ゲームセッション)
-- host_player_id / asker_player_id は循環FK回避のため FK 制約なし
-- ======================
CREATE TABLE rooms (
  code                TEXT PRIMARY KEY,
  host_player_id      UUID,               -- FK なし（循環参照回避）
  state               TEXT NOT NULL DEFAULT 'WAITING_PLAYERS'
                      CHECK (state IN (
                        'WAITING_PLAYERS','SELECT_THEME','SELECT_ASKER',
                        'ASKER_RANKING','REVEAL_MIDDLE','GUESSING_OPEN',
                        'GUESSING_CLOSED','RESULT_REVEALED','ROUND_SUMMARY'
                      )),
  current_round       INTEGER DEFAULT 0,
  asker_player_id     UUID,               -- FK なし
  current_guess_rank  INTEGER,            -- 現在予想中の順位 (1,2,3,5,6)
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ======================
-- PLAYERS
-- 参加者
-- ======================
CREATE TABLE players (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_code   TEXT NOT NULL REFERENCES rooms(code) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  is_host     BOOLEAN DEFAULT false,
  joined_at   TIMESTAMPTZ DEFAULT NOW(),
  last_seen   TIMESTAMPTZ DEFAULT NOW()
);

-- ======================
-- ROUNDS
-- ラウンド記録
-- ranking_json: ["item_id_1位", "item_id_2位", ..., "item_id_7位"]
-- middle_revealed_value: 4位のアイテムID（公開される）
-- ======================
CREATE TABLE rounds (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_code             TEXT NOT NULL REFERENCES rooms(code) ON DELETE CASCADE,
  round_no              INTEGER NOT NULL,
  theme_id              TEXT REFERENCES themes(id),
  asker_player_id       UUID,
  ranking_json          JSONB,   -- ["item_id", ...] index=0が1位
  middle_revealed_value TEXT,    -- index 3 の item_id（4位）
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(room_code, round_no)
);

-- ======================
-- GUESSES
-- 参加者の1位予想
-- ======================
CREATE TABLE guesses (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_code    TEXT NOT NULL,
  round_no     INTEGER NOT NULL,
  player_id    UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  guess_rank   INTEGER NOT NULL DEFAULT 1,  -- 予想対象の順位 (1,2,3,5,6)
  guess_top1   TEXT NOT NULL,               -- 予想したitem_id
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(room_code, round_no, player_id, guess_rank)
);

-- ======================
-- INDEXES
-- ======================
CREATE INDEX idx_players_room_code    ON players(room_code);
CREATE INDEX idx_rounds_room_code     ON rounds(room_code);
CREATE INDEX idx_guesses_room_round   ON guesses(room_code, round_no);
CREATE INDEX idx_players_last_seen    ON players(last_seen);

-- ======================
-- SEED: テーマデータ
-- ======================
INSERT INTO themes (id, title, emoji, category, items) VALUES
(
  'love',
  '恋愛',
  '💕',
  'love',
  '[
    {"id":"face",        "emoji":"👀", "label":"顔"},
    {"id":"personality", "emoji":"💝", "label":"性格"},
    {"id":"height",      "emoji":"📏", "label":"身長"},
    {"id":"income",      "emoji":"💰", "label":"収入"},
    {"id":"values",      "emoji":"🌟", "label":"価値観"},
    {"id":"talk",        "emoji":"💬", "label":"会話力"},
    {"id":"life_skill",  "emoji":"🏠", "label":"生活力"}
  ]'::jsonb
),
(
  'life',
  '人生観',
  '🌈',
  'life',
  '[
    {"id":"freedom",  "emoji":"🗽", "label":"自由"},
    {"id":"money",    "emoji":"💴", "label":"お金"},
    {"id":"health",   "emoji":"💪", "label":"健康"},
    {"id":"family",   "emoji":"👨‍👩‍👧", "label":"家族"},
    {"id":"work",     "emoji":"🏢", "label":"仕事"},
    {"id":"friends",  "emoji":"👫", "label":"友達"},
    {"id":"fun",      "emoji":"🎮", "label":"楽しみ"}
  ]'::jsonb
),
(
  'drinks',
  '好きなお酒の種類',
  '🍺',
  'light',
  '[
    {"id":"beer",      "emoji":"🍺", "label":"ビール"},
    {"id":"highball",  "emoji":"🥃", "label":"ハイボール"},
    {"id":"sake",      "emoji":"🍶", "label":"日本酒"},
    {"id":"wine",      "emoji":"🍷", "label":"ワイン"},
    {"id":"shochu",    "emoji":"🫗", "label":"焼酎"},
    {"id":"lemonsour", "emoji":"🍋", "label":"レモンサワー"},
    {"id":"tequila",   "emoji":"🌵", "label":"テキーラ"}
  ]'::jsonb
),
(
  'date',
  'デートで大事なもの',
  '🍸',
  'light',
  '[
    {"id":"vibe",       "emoji":"✨", "label":"雰囲気"},
    {"id":"restaurant", "emoji":"🍽️", "label":"お店"},
    {"id":"pay",        "emoji":"💸", "label":"おごり"},
    {"id":"instam",     "emoji":"📸", "label":"映え"},
    {"id":"transport",  "emoji":"🚗", "label":"移動"},
    {"id":"lead",       "emoji":"🎯", "label":"リード"},
    {"id":"ending",     "emoji":"🌙", "label":"終わり方"}
  ]'::jsonb
);

-- ======================
-- RLS (Row Level Security)
-- MVP: API Routes 経由で全操作するためパブリックアクセス許可
-- 本番では見直すこと
-- ======================
ALTER TABLE themes  ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms   ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE rounds  ENABLE ROW LEVEL SECURITY;
ALTER TABLE guesses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_read_themes"  ON themes  FOR SELECT USING (true);
CREATE POLICY "public_read_rooms"   ON rooms   FOR SELECT USING (true);
CREATE POLICY "public_read_players" ON players FOR SELECT USING (true);
CREATE POLICY "public_read_rounds"  ON rounds  FOR SELECT USING (true);
CREATE POLICY "public_read_guesses" ON guesses FOR SELECT USING (true);

-- 書き込みは service_role key (API Routes) のみ許可
-- anon key では書き込み不可
