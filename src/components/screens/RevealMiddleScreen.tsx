'use client'

import { getThemeItem } from '@/lib/themes'
import type { RoomStateResponse } from '@/lib/types'

interface Props {
  gameState: RoomStateResponse
  playerId: string
  onAction: (action: string, params?: Record<string, unknown>) => Promise<boolean>
}

export default function RevealMiddleScreen({ gameState, playerId, onAction }: Props) {
  const { room, players, theme, round } = gameState
  const isAsker = room.asker_player_id === playerId
  const asker = players.find(p => p.id === room.asker_player_id)
  const isPersonRank = round?.is_person_rank ?? false

  // ヒント位置: 人ランキング=3位, 通常=4位
  const hintRank = isPersonRank ? 3 : 4
  const middleValue = round?.middle_revealed_value ?? null

  // 公開されたアイテムまたはプレイヤーの情報
  const middleLabel: { emoji?: string; name: string } | null = (() => {
    if (!middleValue) return null
    if (isPersonRank) {
      const p = players.find(pl => pl.id === middleValue)
      return p ? { name: p.name } : null
    }
    const item = theme ? getThemeItem(theme.id, middleValue) : null
    return item ? { emoji: item.emoji, name: item.label } : null
  })()

  // 残りの選択肢（ヒント以外）
  const remaining = (() => {
    if (isPersonRank && round?.target_player_ids) {
      return round.target_player_ids
        .filter(id => id !== middleValue)
        .map(id => {
          const p = players.find(pl => pl.id === id)
          return p ? { id: p.id, emoji: '', label: p.name } : null
        })
        .filter(Boolean) as Array<{ id: string; emoji: string; label: string }>
    }
    return (theme?.items ?? []).filter(i => i.id !== middleValue)
  })()

  const totalGuesses = round?.rank_sequence?.length ?? 0

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-4 py-8">
      <div className="text-center mb-8 animate-fade-in">
        <p className="text-gray-500 text-xs mb-1">ラウンド {room.current_round} · {theme?.title} {theme?.emoji}</p>
        <h2 className="text-2xl font-black text-gray-900">
          📌 ヒント！{hintRank}位は{isPersonRank ? 'この人！' : 'これ！'}
        </h2>
        <p className="text-gray-600 text-sm mt-1">
          <span className="text-yellow-600 font-bold">{asker?.name}</span> さんのランキング
        </p>
        {isPersonRank && totalGuesses > 0 && (
          <p className="text-gray-400 text-xs mt-2">
            ここからみんなで {totalGuesses} 回、誰が何位かを当てていくよ！
          </p>
        )}
      </div>

      {/* ヒント位置の公開 */}
      {middleLabel && (
        <div className="animate-bounce-in mb-8">
          <p className="text-center text-gray-500 text-sm mb-3">{asker?.name} さんの{hintRank}位は...</p>
          <div className="glass-strong rounded-3xl p-8 text-center shadow-xl shadow-purple-100">
            {middleLabel.emoji ? (
              <div className="text-8xl mb-3 animate-pop">{middleLabel.emoji}</div>
            ) : (
              <div className="text-8xl mb-3 animate-pop">🧑</div>
            )}
            <p className="text-3xl font-black text-gray-900">{middleLabel.name}</p>
            <div className="mt-3 inline-block bg-pink-100 text-pink-700 text-sm px-3 py-1 rounded-full font-bold">
              {hintRank}位
            </div>
          </div>
        </div>
      )}

      {/* 残りの選択肢 */}
      {remaining.length > 0 && (
        <div className="glass rounded-3xl p-4 mb-6 w-full max-w-sm animate-fade-in">
          <div className="flex flex-wrap gap-2 justify-center">
            {remaining.map(item => (
              <span key={item.id} className="glass rounded-xl px-3 py-2 text-sm text-gray-700">
                {item.emoji} {item.label}
              </span>
            ))}
          </div>
        </div>
      )}

      <p className="text-gray-500 text-sm text-center mb-4">
        {isPersonRank
          ? `まず1位を予想しよう！（全部で${totalGuesses}回予想するよ）`
          : '1位は何だと思う？'}
      </p>

      {isAsker ? (
        <div className="w-full max-w-sm space-y-3">
          <button
            onClick={() => onAction('open-guessing')}
            className="btn-primary w-full text-xl py-4"
          >
            🎯 予想スタート！
          </button>
          <button
            onClick={() => onAction('back-to-theme')}
            className="w-full glass rounded-2xl py-3 text-sm text-gray-500 font-semibold active:scale-95 transition-all"
          >
            ← テーマを選び直す
          </button>
        </div>
      ) : (
        <div className="glass rounded-2xl py-4 px-6 text-center w-full max-w-sm">
          <p className="text-gray-500 text-sm">⏳ {asker?.name} さんが予想をオープンするのを待ってます</p>
        </div>
      )}
    </div>
  )
}
