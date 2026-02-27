'use client'

import { getThemeItem } from '@/lib/themes'
import type { RoomStateResponse } from '@/lib/types'

interface Props {
  gameState: RoomStateResponse
  playerId: string
  onAction: (action: string, params?: Record<string, unknown>) => Promise<void>
}

export default function RevealMiddleScreen({ gameState, playerId, onAction }: Props) {
  const { room, players, theme, round } = gameState
  const isHost = players.find(p => p.id === playerId)?.is_host ?? false
  const asker = players.find(p => p.id === room.asker_player_id)
  const middleItem = theme && round?.middle_revealed_value
    ? getThemeItem(theme.id, round.middle_revealed_value)
    : null

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-4 py-8">
      <div className="text-center mb-8 animate-fade-in">
        <p className="text-white/40 text-xs mb-1">ラウンド {room.current_round} · {theme?.title} {theme?.emoji}</p>
        <h2 className="text-2xl font-black text-white">4位が公開！</h2>
        <p className="text-white/50 text-sm mt-1">
          <span className="text-yellow-400 font-bold">{asker?.name}</span> さんのランキング
        </p>
      </div>

      {/* 4位の公開 */}
      {middleItem && (
        <div className="animate-bounce-in mb-8">
          <p className="text-center text-white/40 text-sm mb-3">4位（真ん中）は...</p>
          <div className="glass-strong rounded-3xl p-8 text-center shadow-2xl shadow-pink-900/30">
            <div className="text-8xl mb-3 animate-pop">{middleItem.emoji}</div>
            <p className="text-3xl font-black text-white">{middleItem.label}</p>
            <div className="mt-3 inline-block bg-pink-500/20 text-pink-300 text-sm px-3 py-1 rounded-full">
              4位
            </div>
          </div>
        </div>
      )}

      {/* 残りのアイテム（シャッフル表示） */}
      {theme && (
        <div className="glass rounded-3xl p-4 mb-6 w-full max-w-sm animate-fade-in">
          <p className="text-white/40 text-xs mb-2 text-center">残りのアイテム（順番はシャッフル）</p>
          <div className="flex flex-wrap gap-2 justify-center">
            {theme.items
              .filter(i => i.id !== round?.middle_revealed_value)
              .sort(() => Math.random() - 0.5)
              .map(item => (
                <span key={item.id} className="glass rounded-xl px-3 py-2 text-sm">
                  {item.emoji} {item.label}
                </span>
              ))}
          </div>
        </div>
      )}

      <p className="text-white/40 text-sm text-center mb-4">
        1位は何だと思う？
      </p>

      {isHost ? (
        <button
          onClick={() => onAction('open-guessing')}
          className="btn-primary w-full max-w-sm text-xl py-4"
        >
          🎯 予想スタート！
        </button>
      ) : (
        <div className="glass rounded-2xl py-4 px-6 text-center w-full max-w-sm">
          <p className="text-white/50 text-sm">⏳ ホストが予想をオープンするのを待ってます</p>
        </div>
      )}
    </div>
  )
}
