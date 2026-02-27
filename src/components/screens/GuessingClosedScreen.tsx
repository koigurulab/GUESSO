'use client'

import type { RoomStateResponse } from '@/lib/types'

interface Props {
  gameState: RoomStateResponse
  playerId: string
  onAction: (action: string, params?: Record<string, unknown>) => Promise<void>
}

export default function GuessingClosedScreen({ gameState, playerId, onAction }: Props) {
  const { room, players, guess_count } = gameState
  const isHost = players.find(p => p.id === playerId)?.is_host ?? false
  const guesserCount = players.filter(p => p.id !== room.asker_player_id).length

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-4">
      <div className="text-center animate-bounce-in">
        <div className="text-6xl mb-4">🔔</div>
        <h2 className="text-2xl font-black text-white mb-2">予想締め切り！</h2>
        <p className="text-white/50">
          {guess_count}/{guesserCount}人 が予想しました
        </p>
        <div className="mt-6 glass rounded-2xl p-5 text-center">
          <div className="flex justify-center gap-1 mb-3">
            {Array.from({ length: guesserCount }).map((_, i) => (
              <div
                key={i}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-lg
                  ${i < guess_count ? 'bg-green-500/30 text-green-400' : 'bg-white/10 text-white/20'}`}
              >
                {i < guess_count ? '✓' : '?'}
              </div>
            ))}
          </div>
          <p className="text-white/40 text-sm">結果を公開しましょう！</p>
        </div>
        {isHost ? (
          <button
            onClick={() => onAction('reveal-result')}
            className="mt-6 btn-primary text-xl px-10 py-4"
          >
            🎊 結果を公開！
          </button>
        ) : (
          <div className="mt-6 glass rounded-2xl py-4 px-6">
            <p className="text-white/50 text-sm">⏳ ホストが結果を公開します...</p>
          </div>
        )}
      </div>
    </div>
  )
}
