// ============================================================
// Game State Machine
// ============================================================
export type RoomState =
  | 'WAITING_PLAYERS'   // ロビー待機
  | 'SELECT_THEME'      // ホストがテーマ選択
  | 'SELECT_ASKER'      // ホストが出題者指名
  | 'SELECT_TARGETS'    // 出題者が対象プレイヤーを選択（人ランキングのみ）
  | 'ASKER_RANKING'     // 出題者がランキング入力
  | 'REVEAL_MIDDLE'     // ヒント位置が公開された状態（ホスト待ち）
  | 'GUESSING_OPEN'     // 全員が予想中
  | 'GUESSING_CLOSED'   // 締切（ホストが結果公開待ち）
  | 'RESULT_REVEALED'   // 順位ごとの結果公開
  | 'ROUND_SUMMARY'     // ラウンド終了サマリー（スコアボード）

// ============================================================
// DB Models
// ============================================================
export interface ThemeItem {
  id: string
  emoji: string
  label: string
}

export interface Theme {
  id: string
  title: string
  emoji: string
  category: 'love' | 'life' | 'light' | 'custom' | 'fetish' | 'person-rank'
  items: ThemeItem[]
  is_free: boolean
  is_person_rank?: boolean  // 人ランキングモードフラグ
}

export interface Room {
  code: string
  host_player_id: string | null
  state: RoomState
  current_round: number
  asker_player_id: string | null
  created_at: string
  updated_at: string
}

export interface Player {
  id: string
  room_code: string
  name: string
  is_host: boolean
  joined_at: string
  last_seen: string
}

export interface Round {
  id: string
  room_code: string
  round_no: number
  theme_id: string | null
  asker_player_id: string | null
  ranking_json: string[] | null    // [item_id_1位, ..., item_id_7位]
  middle_revealed_value: string | null  // 4位のitem_id
  created_at: string
}

export interface Guess {
  id: string
  room_code: string
  round_no: number
  player_id: string
  guess_top1: string   // item_id
  submitted_at: string
}

// ============================================================
// API Response Types
// ============================================================
export interface RoomStateResponse {
  /** rooms.updated_at — クライアントがETagとして使用する */
  updated_at: string
  room: {
    code: string
    state: RoomState
    current_round: number
    asker_player_id: string | null
    current_guess_rank: number | null  // 現在予想中の順位 (1,2,3,5,6)
    line_verified: boolean
    line_verify_code: string | null
  }
  players: Pick<Player, 'id' | 'name' | 'is_host' | 'last_seen'>[]
  theme: Theme | null
  round: {
    round_no: number
    theme_id: string | null
    asker_player_id: string | null
    ranking_json: (string | null)[] | null  // null=非公開, string=公開済みitem_id or player_id
    middle_revealed_value: string | null
    is_person_rank: boolean
    target_player_ids: string[] | null     // 人ランキング: 対象プレイヤーID一覧
    rank_sequence: number[] | null         // 予想する順位配列 e.g.[1,2,4]
  } | null
  guess_count: number
  my_guess: string | null
  // only populated in RESULT_REVEALED
  guesses: Array<{ player_id: string; guess_top1: string }> | null
  // only populated in ROUND_SUMMARY
  scores: Array<{ player_id: string; total: number }> | null        // ゲーム通算スコア
  round_scores: Array<{ player_id: string; correct: number }> | null // 今ラウンドのスコア（称号用）
}

// ============================================================
// API Action Types
// ============================================================
export type GameAction =
  | 'start-game'
  | 'select-theme'
  | 'select-asker'
  | 'select-targets'
  | 'submit-ranking'
  | 'open-guessing'
  | 'submit-guess'
  | 'close-guess'
  | 'reveal-result'
  | 'next-rank'
  | 'show-summary'
  | 'next-round'
  | 'kick-player'
  | 'back-to-theme'

export interface ActionRequest {
  action: GameAction
  player_id: string
  // action-specific
  theme_id?: string
  asker_player_id?: string
  ranking?: string[]
  guess_top1?: string
  kick_player_id?: string
  // LINE verification
  line_verify_code?: string
  // 人ランキング: 対象プレイヤーID一覧
  target_player_ids?: string[]
}
