# GUESSO — 価値観推理ゲーム

飲み会向けWebゲームのMVP実装。ポーリングベースのリアルタイム同期。

## Tech Stack

- **フレームワーク**: Next.js 14 (App Router, TypeScript)
- **スタイリング**: Tailwind CSS (glassmorphism design)
- **DB**: Supabase (PostgreSQL)
- **DnD**: @dnd-kit/sortable (ランキング入力)
- **デプロイ**: Vercel

## Project Structure

```
src/
├── app/
│   ├── page.tsx              # ランディング（ルーム作成/参加）
│   ├── layout.tsx            # ルートレイアウト
│   ├── globals.css           # グローバルCSS + Tailwindユーティリティ
│   ├── api/
│   │   └── room/
│   │       ├── create/route.ts     # POST ルーム作成
│   │       ├── join/route.ts       # POST ルーム参加
│   │       └── [code]/
│   │           ├── state/route.ts  # GET ルーム状態（ポーリング用）
│   │           └── action/route.ts # POST ゲームアクション
│   └── room/
│       └── [code]/
│           ├── page.tsx      # ルームページ（server component, thin wrapper）
│           ├── GameRoom.tsx  # ゲームロジック（client component）
│           └── share/
│               └── page.tsx  # 結果シェアカード
├── components/
│   └── screens/
│       ├── LobbyScreen.tsx         # WAITING_PLAYERS
│       ├── ThemeSelectScreen.tsx   # SELECT_THEME
│       ├── ChooseAskerScreen.tsx   # SELECT_ASKER
│       ├── RankInputScreen.tsx     # ASKER_RANKING（DnD）
│       ├── RevealMiddleScreen.tsx  # REVEAL_MIDDLE
│       ├── GuessingScreen.tsx      # GUESSING_OPEN
│       ├── GuessingClosedScreen.tsx # GUESSING_CLOSED
│       └── ResultScreen.tsx        # RESULT_REVEALED
└── lib/
    ├── types.ts       # 全型定義 + RoomState型
    ├── themes.ts      # テーマデータ（クライアント側定数）
    └── supabase.ts    # Supabaseクライアント（サーバーサイド専用）
```

## State Machine

```
WAITING_PLAYERS
  → [ホスト: start-game]
SELECT_THEME
  → [ホスト: select-theme (theme_id)]
SELECT_ASKER
  → [ホスト: select-asker (asker_player_id)]
ASKER_RANKING
  → [出題者: submit-ranking (ranking[7])]
REVEAL_MIDDLE        ← 4位のみ公開
  → [ホスト: open-guessing]
GUESSING_OPEN        ← 全員が1位予想
  → [ホスト: close-guess]
GUESSING_CLOSED
  → [ホスト: reveal-result]
RESULT_REVEALED      ← 全ランキング公開
  → [ホスト: next-round] → SELECT_THEME (round+1)
```

各状態での権限:
| 状態 | ホスト | 出題者 | その他参加者 |
|------|--------|--------|-------------|
| WAITING_PLAYERS | start-game, kick-player | 待機 | 待機 |
| SELECT_THEME | select-theme | 待機 | 待機 |
| SELECT_ASKER | select-asker | 待機 | 待機 |
| ASKER_RANKING | 待機 | submit-ranking | 待機 |
| REVEAL_MIDDLE | open-guessing | 待機 | 待機 |
| GUESSING_OPEN | close-guess | 待機（自分はNG） | submit-guess |
| GUESSING_CLOSED | reveal-result | 待機 | 待機 |
| RESULT_REVEALED | next-round | 閲覧 | 閲覧 |

## DB Schema

```sql
themes    (id, title, emoji, category, items JSONB, is_free)
rooms     (code PK, host_player_id, state, current_round, asker_player_id)
players   (id UUID, room_code FK, name, is_host, joined_at, last_seen)
rounds    (id, room_code, round_no, theme_id, asker_player_id,
           ranking_json JSONB, middle_revealed_value)
guesses   (id, room_code, round_no, player_id FK, guess_top1)
```

- `ranking_json`: `["item_id_1位", ..., "item_id_7位"]` (index 0 = 1位)
- `middle_revealed_value`: `ranking_json[3]` (4位のitem_id)
- rooms と players の間の循環FK を避けるため `host_player_id`/`asker_player_id` はFK制約なし

## API Endpoints

### Public
| Method | Path | 説明 |
|--------|------|------|
| POST | /api/room/create | ルーム作成 (host_name → room_code, player_id) |
| POST | /api/room/join | ルーム参加 (room_code, name → player_id) |
| GET | /api/room/[code]/state | ポーリング用状態取得 (?player_id=) |
| POST | /api/room/[code]/action | ゲームアクション実行 |

### Action API body
```json
{
  "action": "start-game|select-theme|select-asker|submit-ranking|open-guessing|submit-guess|close-guess|reveal-result|next-round|kick-player",
  "player_id": "uuid",
  "theme_id": "optional",
  "asker_player_id": "optional",
  "ranking": ["item_id",...],
  "guess_top1": "item_id",
  "kick_player_id": "optional"
}
```

## Key Conventions

### セキュリティ原則
- 全ての書き込みは Next.js API Routes 経由（`SUPABASE_SERVICE_ROLE_KEY` 使用）
- `NEXT_PUBLIC_SUPABASE_*` はクライアントから直接書き込まない
- アクションごとにサーバー側で `state` + `is_host` + `asker_id` を検証
- 不正アクションは 400/403 で弾く

### データの公開制御
- `ranking_json`: `RESULT_REVEALED` 状態になるまでレスポンスに含めない
- `guesses` (全員分): `RESULT_REVEALED` 状態になるまで含めない
- `middle_revealed_value`: `REVEAL_MIDDLE` 以降は公開

### 同期方式
- クライアントは 2秒毎に `GET /state` をポーリング
- アクション実行後は即座に `fetchState()` を呼んでUI更新

### localStorage
- プレイヤーID は `guesso_{roomCode}` キーで保存
- `{ playerId: string, playerName: string }` の JSON

### テーマデータ
- `src/lib/themes.ts` にクライアント側定数として定義
- DBにも seed データあり（将来の拡張用）
- テーマ追加: `THEMES` 配列に追加 + `supabase/schema.sql` の INSERT も更新

## Development Setup

```bash
# 1. 依存関係インストール
npm install

# 2. 環境変数設定
cp .env.local.example .env.local
# Supabase URL と keys を設定

# 3. Supabase でスキーマ実行
# supabase/schema.sql を Supabase SQL Editor で実行

# 4. 開発サーバー起動
npm run dev
```

## Themes

| ID | タイトル | カテゴリ | アイテム |
|----|--------|---------|--------|
| love | 恋愛 💕 | love | 顔/性格/身長/収入/価値観/会話力/生活力 |
| life | 人生観 🌈 | life | 自由/お金/健康/家族/仕事/友達/楽しみ |
| date | デート 🍸 | light | 雰囲気/お店/おごり/映え/移動/リード/終わり方 |

## Future Expansion Points

- **課金テーマ**: `themes.is_free = false` + 決済フロー
- **演出拡張**: `REVEAL_MIDDLE` での公開枚数を `rounds.reveal_count` で制御
- **カスタムテーマ**: `category = 'custom'` + NGワードガード
- **広告**: `RESULT_REVEALED` → `SELECT_THEME` 遷移間に挿入
- **WebSocket移行**: ポーリング部分を Supabase Realtime に差し替え可
