'use client'

import { useState } from 'react'
import type { RoomStateResponse } from '@/lib/types'

interface Props {
  gameState: RoomStateResponse
  playerId: string
  onAction: (action: string, params?: Record<string, unknown>) => Promise<boolean>
}

export default function SelectTargetsScreen({ gameState, playerId, onAction }: Props) {
  const { room, players, theme } = gameState
  const isAsker = room.asker_player_id === playerId
  const asker = players.find(p => p.id === room.asker_player_id)

  // 出題者自身を除いた選択可能なプレイヤー一覧
  const selectablePlayers = players.filter(p => p.id !== room.asker_player_id)

  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [submitting, setSubmitting] = useState(false)

  const togglePlayer = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else if (next.size < 7) {
        next.add(id)
      }
      return next
    })
  }

  const handleSubmit = async () => {
    if (submitting || selected.size < 3) return
    setSubmitting(true)
    // 選択順を保持する（Set は挿入順）
    const target_player_ids = Array.from(selected)
    const ok = await onAction('select-targets', { target_player_ids })
    if (!ok) setSubmitting(false)
  }

  // 出題者以外の画面
  if (!isAsker) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center px-4">
        <div className="text-center animate-bounce-in">
          <div className="text-6xl mb-4">👀</div>
          <h2 className="text-2xl font-black text-gray-900 mb-2">
            {asker?.name} さんが
          </h2>
          <p className="text-gray-600 text-lg">誰をランク付けするか選んでいます</p>
          <p className="text-gray-400 text-sm mt-1">あなたは選ばれる？</p>
          <div className="mt-6 flex gap-1 justify-center">
            {[0, 1, 2].map(i => (
              <div
                key={i}
                className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
          {theme && (
            <div className="mt-6 glass rounded-2xl p-4">
              <p className="text-gray-500 text-xs">テーマ: {theme.emoji} {theme.title}</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  // 出題者の画面
  return (
    <div className="min-h-dvh flex flex-col px-4 py-8">
      <div className="text-center mb-5 animate-fade-in">
        <div className="text-3xl mb-1">{theme?.emoji}</div>
        <h2 className="text-xl font-black gradient-text">{theme?.title}</h2>
        <p className="text-gray-600 text-sm mt-2">
          正直にランク付けする人を <strong>3〜7人</strong> 選んでね
        </p>
        <p className="text-gray-500 text-xs mt-1">
          選んだ全員をこっそりランク付け！みんながあなたの答えを当てにくるよ
        </p>
      </div>

      <div className="space-y-2 flex-1 animate-slide-up">
        {selectablePlayers.map(p => {
          const isSelected = selected.has(p.id)
          const rank = isSelected
            ? Array.from(selected).indexOf(p.id) + 1
            : null

          return (
            <button
              key={p.id}
              onClick={() => togglePlayer(p.id)}
              disabled={submitting || (!isSelected && selected.size >= 7)}
              className={`
                w-full glass rounded-2xl px-4 py-4 flex items-center gap-4
                active:scale-95 transition-all
                ${isSelected ? 'ring-2 ring-purple-500 glass-strong' : ''}
                ${!isSelected && selected.size >= 7 ? 'opacity-40' : ''}
              `}
            >
              <div className={`
                w-10 h-10 rounded-full flex items-center justify-center font-black text-lg
                ${isSelected
                  ? 'bg-gradient-to-br from-purple-500 to-violet-600 text-white'
                  : 'bg-gray-100 text-gray-400'}
              `}>
                {isSelected ? rank : ''}
                {!isSelected && <span className="text-gray-400">○</span>}
              </div>
              <span className="font-bold text-lg text-gray-900 flex-1 text-left">
                {p.name}
              </span>
              {p.is_host && <span className="text-xs text-yellow-600 font-bold">👑</span>}
            </button>
          )
        })}
      </div>

      <div className="mt-5 glass rounded-2xl p-3 mb-4 text-center">
        <p className="text-gray-600 text-sm">
          選択中: <strong className={selected.size >= 3 ? 'text-purple-600' : 'text-gray-400'}>{selected.size}</strong> / 最大7人
          {selected.size < 3 && (
            <span className="text-gray-400 ml-2">（あと{3 - selected.size}人以上選んでね）</span>
          )}
        </p>
      </div>

      <button
        onClick={handleSubmit}
        disabled={submitting || selected.size < 3}
        className="btn-primary w-full text-xl py-4 disabled:opacity-40"
      >
        {submitting ? '送信中...' : `✅ この${selected.size}人でランク付けスタート！`}
      </button>
    </div>
  )
}
