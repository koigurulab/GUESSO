'use client'

import { THEMES } from '@/lib/themes'
import type { RoomStateResponse } from '@/lib/types'

interface Props {
  gameState: RoomStateResponse
  playerId: string
  onAction: (action: string, params?: Record<string, unknown>) => Promise<void>
}

const categoryColor: Record<string, string> = {
  love:  'from-pink-500 to-rose-600',
  life:  'from-blue-500 to-indigo-600',
  light: 'from-amber-500 to-orange-600',
}

export default function ThemeSelectScreen({ gameState, playerId, onAction }: Props) {
  const { room, players } = gameState
  const isHost = players.find(p => p.id === playerId)?.is_host ?? false

  return (
    <div className="min-h-dvh flex flex-col px-4 py-8">
      <div className="text-center mb-6 animate-fade-in">
        <p className="text-white/40 text-xs mb-1">ラウンド {room.current_round}</p>
        <h2 className="text-2xl font-black text-white">テーマを選ぼう！</h2>
      </div>

      <div className="space-y-3 flex-1 animate-slide-up">
        {THEMES.map(theme => (
          <button
            key={theme.id}
            onClick={() => isHost && onAction('select-theme', { theme_id: theme.id })}
            disabled={!isHost}
            className={`
              w-full glass rounded-3xl p-5 text-left
              transition-all active:scale-95
              ${isHost ? 'cursor-pointer hover:glass-strong' : 'cursor-default opacity-80'}
            `}
          >
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${categoryColor[theme.category]} flex items-center justify-center text-3xl`}>
                {theme.emoji}
              </div>
              <div className="flex-1">
                <p className="font-black text-xl">{theme.title}</p>
                <div className="flex gap-1.5 mt-1 flex-wrap">
                  {theme.items.map(item => (
                    <span key={item.id} className="text-xs text-white/40">
                      {item.emoji}{item.label}
                    </span>
                  ))}
                </div>
              </div>
              {isHost && <span className="text-white/30">›</span>}
            </div>
          </button>
        ))}
      </div>

      {!isHost && (
        <div className="mt-4 glass rounded-2xl py-4 text-center">
          <p className="text-white/50 text-sm">⏳ ホストがテーマを選んでいます...</p>
        </div>
      )}
    </div>
  )
}
