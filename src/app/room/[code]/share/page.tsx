'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getThemeItem } from '@/lib/themes'
import type { RoomStateResponse } from '@/lib/types'

function calcMostGuessed(guesses: Array<{ guess_top1: string }> | null) {
  if (!guesses || guesses.length === 0) return null
  const counts: Record<string, number> = {}
  guesses.forEach(g => { counts[g.guess_top1] = (counts[g.guess_top1] ?? 0) + 1 })
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]
}

export default function ShareCardPage() {
  const params = useParams()
  const router = useRouter()
  const roomCode = (params.code as string).toUpperCase()
  const [state, setState] = useState<RoomStateResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem(`guesso_${roomCode}`)
    const playerId = stored ? JSON.parse(stored).playerId : ''
    fetch(`/api/room/${roomCode}/state?player_id=${playerId}`)
      .then(r => r.json())
      .then(d => { setState(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [roomCode])

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <p className="text-white/40">読み込み中...</p>
      </div>
    )
  }

  if (!state || state.room.state !== 'RESULT_REVEALED' || !state.round?.ranking_json || !state.theme) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center px-4 text-center">
        <div className="text-5xl mb-4">😅</div>
        <p className="text-white">結果がまだ公開されていません</p>
        <button onClick={() => router.back()} className="btn-secondary mt-4">
          戻る
        </button>
      </div>
    )
  }

  const { theme, round, players, guesses, room } = state
  const ranking = round.ranking_json!
  const asker = players.find(p => p.id === round.asker_player_id)
  const mostGuessed = calcMostGuessed(guesses)
  const correctCount = guesses?.filter(g => g.guess_top1 === ranking[0]).length ?? 0

  return (
    <div className="min-h-dvh flex flex-col items-center py-6 px-4"
      style={{ background: 'linear-gradient(135deg, #1a0533, #0d1b3e, #1a0533)' }}>

      {/* Back button */}
      <button
        onClick={() => router.back()}
        className="self-start text-white/40 text-sm mb-4 flex items-center gap-1"
      >
        ← ゲームに戻る
      </button>

      {/* Share Card */}
      <div
        id="share-card"
        className="w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl shadow-purple-900/50"
        style={{
          background: 'linear-gradient(160deg, #1e0845 0%, #0a1628 50%, #1e0845 100%)',
          border: '1px solid rgba(168,85,247,0.3)',
        }}
      >
        {/* Header */}
        <div className="p-5 pb-3 text-center"
          style={{ background: 'linear-gradient(135deg, rgba(236,72,153,0.2), rgba(168,85,247,0.2))' }}>
          <p className="text-white/40 text-xs">GUESSO · ラウンド {room.current_round}</p>
          <div className="text-5xl my-2">{theme.emoji}</div>
          <h2 className="text-2xl font-black text-white">{theme.title}</h2>
          <p className="text-white/50 text-sm mt-1">
            <span className="text-yellow-400 font-bold">{asker?.name}</span> さんの価値観
          </p>
        </div>

        {/* Ranking */}
        <div className="px-4 py-3 space-y-1.5">
          {ranking.map((itemId, idx) => {
            const item = getThemeItem(theme.id, itemId)
            if (!item) return null
            const rank = idx + 1
            const isTop = rank === 1
            const isMiddle = idx === 3
            return (
              <div
                key={itemId}
                className={`flex items-center gap-3 rounded-xl px-3 py-2
                  ${isTop ? 'bg-yellow-400/20 border border-yellow-400/40' :
                    isMiddle ? 'bg-pink-400/10 border border-pink-400/30' :
                    'bg-white/5'}`}
              >
                <span className="text-base font-black w-7 text-center">
                  {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank}
                </span>
                <span className="text-xl">{item.emoji}</span>
                <span className={`font-bold flex-1 text-sm ${isTop ? 'text-yellow-300' : 'text-white'}`}>
                  {item.label}
                </span>
                {isMiddle && <span className="text-xs text-pink-400">公開</span>}
              </div>
            )
          })}
        </div>

        {/* Stats */}
        <div className="px-4 pb-4 space-y-2">
          {mostGuessed && (
            <div className="bg-white/5 rounded-xl px-3 py-2 flex items-center gap-2">
              <span className="text-lg">📊</span>
              <span className="text-white/50 text-xs">最多予想</span>
              <span className="font-bold text-sm ml-auto">
                {getThemeItem(theme.id, mostGuessed[0])?.emoji}{' '}
                {getThemeItem(theme.id, mostGuessed[0])?.label}
                <span className="text-white/40 text-xs ml-1">({mostGuessed[1]}票)</span>
              </span>
            </div>
          )}
          <div className="bg-white/5 rounded-xl px-3 py-2 flex items-center gap-2">
            <span className="text-lg">👑</span>
            <span className="text-white/50 text-xs">正解者</span>
            <span className="font-bold text-sm ml-auto text-green-400">
              {correctCount}/{players.filter(p => p.id !== asker?.id).length}人
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 pb-5 text-center">
          <p className="text-white/20 text-xs">GUESSO · 価値観推理ゲーム</p>
        </div>
      </div>

      <p className="text-white/30 text-xs mt-6 text-center">
        スクリーンショットで友達にシェアしよう！📸
      </p>
    </div>
  )
}
