'use client'

import { useState } from 'react'
import { FREE_THEMES, FETISH_THEMES } from '@/lib/themes'
import type { RoomStateResponse } from '@/lib/types'

interface Props {
  gameState: RoomStateResponse
  playerId: string
  onAction: (action: string, params?: Record<string, unknown>) => Promise<boolean>
}

const categoryColor: Record<string, string> = {
  love:   'from-pink-500 to-rose-600',
  life:   'from-blue-500 to-indigo-600',
  light:  'from-amber-500 to-orange-600',
  fetish: 'from-purple-500 to-violet-600',
}

export default function ThemeSelectScreen({ gameState, playerId, onAction }: Props) {
  const { room, players } = gameState
  const isHost = players.find(p => p.id === playerId)?.is_host ?? false
  const lineVerified = room.line_verified

  // フェチテーマのサブ選択（女性/男性）を表示するかどうか
  const [showFetishSub, setShowFetishSub] = useState(false)

  const handleFetishClick = () => {
    if (!isHost) return
    if (!lineVerified) return  // 認証されていなければ何もしない
    setShowFetishSub(prev => !prev)
  }

  return (
    <div className="min-h-dvh flex flex-col px-4 py-8">
      <div className="text-center mb-6 animate-fade-in">
        <p className="text-gray-500 text-xs mb-1">ラウンド {room.current_round}</p>
        <h2 className="text-2xl font-black text-gray-900">テーマを選ぼう！</h2>
      </div>

      <div className="space-y-3 flex-1 animate-slide-up">
        {/* 通常テーマ（無料） */}
        {FREE_THEMES.map(theme => (
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
                <p className="font-black text-lg text-gray-900">{theme.title}</p>
                <div className="flex gap-1.5 mt-1 flex-wrap">
                  {theme.items.map(item => (
                    <span key={item.id} className="text-xs text-gray-500">
                      {item.emoji}{item.label}
                    </span>
                  ))}
                </div>
              </div>
              {isHost && <span className="text-gray-400 text-lg">›</span>}
            </div>
          </button>
        ))}

        {/* フェチテーマ（LINE認証が必要） */}
        <div className={`glass rounded-3xl overflow-hidden transition-all ${isHost && lineVerified ? 'cursor-pointer hover:glass-strong' : ''}`}>
          {/* フェチテーマのメインカード */}
          <button
            onClick={handleFetishClick}
            disabled={!isHost || !lineVerified}
            className="w-full p-5 text-left transition-all active:scale-95 disabled:cursor-default"
          >
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${categoryColor.fetish} flex items-center justify-center text-3xl`}>
                {lineVerified ? '🔥' : '🔒'}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-black text-lg text-gray-900">理解できるフェチ</p>
                  {!lineVerified && (
                    <span className="text-xs bg-green-100 text-green-700 font-bold px-2 py-0.5 rounded-full">
                      LINE認証で解放
                    </span>
                  )}
                  {lineVerified && (
                    <span className="text-xs bg-purple-100 text-purple-700 font-bold px-2 py-0.5 rounded-full">
                      解放済み
                    </span>
                  )}
                </div>

                {!lineVerified ? (
                  <p className="text-xs text-gray-400 mt-1">
                    ロビー画面の確認コードをLINEに送ると解放されます
                  </p>
                ) : (
                  <div className="flex gap-1.5 mt-1 flex-wrap">
                    {FETISH_THEMES.flatMap(t => t.items).slice(0, 5).map(item => (
                      <span key={`${item.id}-preview`} className="text-xs text-gray-500">
                        {item.emoji}{item.label}
                      </span>
                    ))}
                    <span className="text-xs text-gray-400">…</span>
                  </div>
                )}
              </div>
              {isHost && lineVerified && (
                <span className="text-gray-400 text-lg">{showFetishSub ? '∨' : '›'}</span>
              )}
            </div>
          </button>

          {/* サブ選択（女性/男性） — LINE認証済み + ホストのみ表示 */}
          {lineVerified && showFetishSub && isHost && (
            <div className="border-t border-white/30 px-5 pb-5 pt-3 space-y-2">
              <p className="text-xs text-gray-500 mb-2 text-center">対象を選んでください</p>
              {FETISH_THEMES.map(theme => (
                <button
                  key={theme.id}
                  onClick={() => onAction('select-theme', { theme_id: theme.id })}
                  className="w-full bg-white/40 hover:bg-white/60 active:scale-95 rounded-2xl p-4 text-left transition-all"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{theme.emoji}</span>
                    <div className="flex-1">
                      <p className="font-bold text-gray-900 text-sm">{theme.title}</p>
                      <div className="flex gap-1.5 mt-1 flex-wrap">
                        {theme.items.map(item => (
                          <span key={item.id} className="text-xs text-gray-500">
                            {item.emoji}{item.label}
                          </span>
                        ))}
                      </div>
                    </div>
                    <span className="text-gray-400">›</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {!isHost && (
        <div className="mt-4 glass rounded-2xl py-4 text-center">
          <p className="text-gray-500 text-sm">⏳ ホストがテーマを選んでいます...</p>
        </div>
      )}
    </div>
  )
}
