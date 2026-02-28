'use client'

import { useState } from 'react'
import type { RoomStateResponse } from '@/lib/types'

interface Props {
  gameState: RoomStateResponse
  playerId: string
  roomCode: string
  onAction: (action: string, params?: Record<string, unknown>) => Promise<boolean>
}

export default function LobbyScreen({ gameState, playerId, roomCode, onAction }: Props) {
  const { room, players } = gameState
  const isHost = players.find(p => p.id === playerId)?.is_host ?? false
  const [copying, setCopying] = useState(false)

  const appUrl = typeof window !== 'undefined' ? window.location.origin : ''
  const roomUrl = `${appUrl}/room/${roomCode}`

  const handleCopy = async () => {
    await navigator.clipboard.writeText(roomUrl)
    setCopying(true)
    setTimeout(() => setCopying(false), 2000)
  }

  return (
    <div className="min-h-dvh flex flex-col px-4 py-8">
      {/* Header */}
      <div className="text-center mb-6 animate-fade-in">
        <div className="text-4xl mb-2">🎯</div>
        <h1 className="text-3xl font-black gradient-text">GUESSO</h1>
        <p className="text-white/40 text-sm mt-1">みんなが来るのを待ってるよ</p>
      </div>

      {/* Room Code */}
      <div className="glass rounded-3xl p-5 mb-4 text-center animate-slide-up">
        <p className="text-white/40 text-xs mb-1">ルームコード</p>
        <p className="text-4xl font-black tracking-widest text-white">{roomCode}</p>
        <button
          onClick={handleCopy}
          className="mt-3 btn-secondary text-sm py-2 px-4"
        >
          {copying ? '✅ コピーした！' : '🔗 URLをコピー'}
        </button>
      </div>

      {/* Players */}
      <div className="glass rounded-3xl p-5 flex-1 mb-4 animate-slide-up">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-white/80">参加者</h2>
          <span className="text-white/40 text-sm">{players.length}/8人</span>
        </div>
        <div className="space-y-2">
          {players.map(p => (
            <div key={p.id} className="flex items-center gap-3 glass rounded-2xl px-4 py-3">
              <span className="text-2xl">{p.is_host ? '👑' : '😊'}</span>
              <span className="font-semibold flex-1">
                {p.name}
                {p.id === playerId && <span className="text-white/40 text-xs ml-2">（あなた）</span>}
              </span>
              {p.is_host && <span className="text-xs text-yellow-400">ホスト</span>}
              {isHost && !p.is_host && p.id !== playerId && (
                <button
                  onClick={() => onAction('kick-player', { kick_player_id: p.id })}
                  className="text-red-400/60 text-xs hover:text-red-400"
                >
                  退出
                </button>
              )}
            </div>
          ))}
        </div>
        {players.length < 2 && (
          <p className="text-center text-white/30 text-sm mt-4">
            友達を呼んで一緒に遊ぼう！
          </p>
        )}
      </div>

      {/* Start Button (host only) */}
      {isHost ? (
        <button
          onClick={() => onAction('start-game')}
          disabled={players.length < 2}
          className="btn-primary w-full text-xl py-4"
        >
          🎮 ゲームスタート
        </button>
      ) : (
        <div className="glass rounded-2xl py-4 text-center">
          <p className="text-white/50 text-sm">⏳ ホストがスタートするのを待ってます</p>
        </div>
      )}
    </div>
  )
}
