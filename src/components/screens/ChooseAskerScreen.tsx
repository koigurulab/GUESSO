'use client'

import type { RoomStateResponse } from '@/lib/types'

interface Props {
  gameState: RoomStateResponse
  playerId: string
  onAction: (action: string, params?: Record<string, unknown>) => Promise<boolean>
}

export default function ChooseAskerScreen({ gameState, playerId, onAction }: Props) {
  const { room, players, theme } = gameState
  const isHost = players.find(p => p.id === playerId)?.is_host ?? false

  return (
    <div className="min-h-dvh flex flex-col px-4 py-8">
      <div className="text-center mb-6 animate-fade-in">
        <div className="text-4xl mb-2">{theme?.emoji ?? '🎯'}</div>
        <p className="text-gray-500 text-xs mb-1">ラウンド {room.current_round} · {theme?.title}</p>
        <h2 className="text-2xl font-black text-gray-900">出題者を指名！</h2>
        <p className="text-gray-500 text-sm mt-1">誰の価値観を当てる？</p>
      </div>

      {/* Theme items preview */}
      {theme && (
        <div className="glass rounded-3xl p-4 mb-5 animate-fade-in">
          <p className="text-gray-500 text-xs mb-2 text-center">このテーマのアイテム</p>
          <div className="flex flex-wrap gap-2 justify-center">
            {theme.items.map(item => (
              <span key={item.id} className="glass rounded-xl px-3 py-1.5 text-sm text-gray-700">
                {item.emoji} {item.label}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Player list */}
      <div className="space-y-2 flex-1 animate-slide-up">
        {players.map(p => (
          <button
            key={p.id}
            onClick={() => isHost && onAction('select-asker', { asker_player_id: p.id })}
            disabled={!isHost}
            className={`
              w-full glass rounded-2xl px-5 py-4 flex items-center gap-3
              transition-all
              ${isHost ? 'active:scale-95 hover:glass-strong cursor-pointer' : 'cursor-default'}
            `}
          >
            <span className="text-2xl">{p.is_host ? '👑' : '😊'}</span>
            <span className="font-bold flex-1 text-left text-gray-900">
              {p.name}
              {p.id === playerId && <span className="text-gray-400 text-xs ml-2">（あなた）</span>}
            </span>
            {isHost && (
              <span className="text-pink-500 text-sm font-bold">
                指名 →
              </span>
            )}
          </button>
        ))}
      </div>

      {!isHost && (
        <div className="mt-4 glass rounded-2xl py-4 text-center">
          <p className="text-gray-500 text-sm">⏳ ホストが出題者を選んでいます...</p>
        </div>
      )}
    </div>
  )
}
