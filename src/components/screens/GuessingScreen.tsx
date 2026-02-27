'use client'

import { useState } from 'react'
import { getThemeItem } from '@/lib/themes'
import type { RoomStateResponse } from '@/lib/types'

interface Props {
  gameState: RoomStateResponse
  playerId: string
  onAction: (action: string, params?: Record<string, unknown>) => Promise<void>
}

export default function GuessingScreen({ gameState, playerId, onAction }: Props) {
  const { room, players, theme, round, guess_count, my_guess } = gameState
  const isHost = players.find(p => p.id === playerId)?.is_host ?? false
  const isAsker = room.asker_player_id === playerId
  const asker = players.find(p => p.id === room.asker_player_id)
  const middleItem = theme && round?.middle_revealed_value
    ? getThemeItem(theme.id, round.middle_revealed_value)
    : null

  const [selected, setSelected] = useState<string>(my_guess ?? '')
  const [submitted, setSubmitted] = useState(!!my_guess)
  const [submitting, setSubmitting] = useState(false)

  const guesserCount = players.filter(p => p.id !== room.asker_player_id).length

  const handleSubmitGuess = async (itemId: string) => {
    if (submitting || submitted) return
    setSelected(itemId)
    setSubmitting(true)
    await onAction('submit-guess', { guess_top1: itemId })
    setSubmitted(true)
    setSubmitting(false)
  }

  if (isAsker) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center px-4">
        <div className="text-center animate-fade-in">
          <div className="text-6xl mb-4">🙈</div>
          <h2 className="text-2xl font-black text-white mb-2">あなたは出題者！</h2>
          <p className="text-white/60">みんなが予想してるよ...</p>
          <div className="mt-6 glass rounded-2xl p-4 text-center">
            <p className="text-3xl font-black text-white">{guess_count}</p>
            <p className="text-white/40 text-sm">/{guesserCount}人 予想済み</p>
          </div>
          {isHost && (
            <button
              onClick={() => onAction('close-guess')}
              className="mt-6 btn-primary text-lg px-8"
            >
              🔔 締め切る
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-dvh flex flex-col px-4 py-8">
      <div className="text-center mb-5 animate-fade-in">
        <p className="text-white/40 text-xs mb-1">
          ラウンド {room.current_round} · {asker?.name} さんの価値観
        </p>
        <h2 className="text-xl font-black gradient-text">1位を予想しよう！</h2>
      </div>

      {/* 4位ヒント */}
      {middleItem && (
        <div className="glass rounded-2xl px-4 py-3 flex items-center gap-3 mb-5 animate-slide-up">
          <span className="text-2xl">{middleItem.emoji}</span>
          <div>
            <p className="text-xs text-white/40">4位（公開済み）</p>
            <p className="font-bold">{middleItem.label}</p>
          </div>
          <span className="ml-auto glass px-2 py-1 rounded-lg text-xs text-pink-400">4位</span>
        </div>
      )}

      {/* 既に送信済みの場合 */}
      {submitted && my_guess ? (
        <div className="flex-1 flex flex-col items-center justify-center animate-bounce-in">
          <div className="text-6xl mb-4">✅</div>
          <p className="text-xl font-bold text-white">予想送信ずみ！</p>
          {theme && (
            <div className="mt-4 glass rounded-2xl px-6 py-4 text-center">
              <p className="text-white/40 text-xs mb-1">あなたの予想</p>
              <div className="flex items-center gap-2 justify-center">
                <span className="text-3xl">
                  {getThemeItem(theme.id, my_guess)?.emoji}
                </span>
                <span className="text-xl font-bold">
                  {getThemeItem(theme.id, my_guess)?.label}
                </span>
              </div>
            </div>
          )}
          <p className="text-white/40 text-sm mt-4">みんなの結果を待ってます...</p>
          <div className="mt-3 glass rounded-2xl px-5 py-3 text-center">
            <p className="text-2xl font-black text-white">{guess_count}</p>
            <p className="text-white/40 text-sm">/{guesserCount}人 予想済み</p>
          </div>
          {isHost && (
            <button
              onClick={() => onAction('close-guess')}
              className="mt-6 btn-primary text-lg px-8"
            >
              🔔 締め切る
            </button>
          )}
        </div>
      ) : (
        <>
          <p className="text-white/50 text-sm text-center mb-3">
            {asker?.name} さんが1位に選んだものは？
          </p>
          <div className="grid grid-cols-2 gap-3 flex-1 animate-slide-up">
            {theme?.items
              .filter(i => i.id !== round?.middle_revealed_value)
              .map(item => (
                <button
                  key={item.id}
                  onClick={() => handleSubmitGuess(item.id)}
                  disabled={submitting}
                  className={`
                    glass rounded-3xl p-5 flex flex-col items-center gap-2
                    active:scale-95 transition-all
                    ${selected === item.id ? 'ring-2 ring-pink-400 glass-strong' : ''}
                  `}
                >
                  <span className="text-5xl">{item.emoji}</span>
                  <span className="font-bold text-sm">{item.label}</span>
                </button>
              ))}
            {/* 4位も選択肢に含める */}
            {theme && round?.middle_revealed_value && (
              <button
                onClick={() => handleSubmitGuess(round.middle_revealed_value!)}
                disabled={submitting}
                className={`
                  glass rounded-3xl p-5 flex flex-col items-center gap-2
                  active:scale-95 transition-all
                  ${selected === round.middle_revealed_value ? 'ring-2 ring-pink-400 glass-strong' : ''}
                `}
              >
                <span className="text-5xl">
                  {getThemeItem(theme.id, round.middle_revealed_value)?.emoji}
                </span>
                <span className="font-bold text-sm">
                  {getThemeItem(theme.id, round.middle_revealed_value)?.label}
                </span>
                <span className="text-xs text-pink-400">（4位）</span>
              </button>
            )}
          </div>
          {isHost && (
            <button
              onClick={() => onAction('close-guess')}
              className="mt-4 btn-secondary w-full"
            >
              🔔 今すぐ締め切る
            </button>
          )}
        </>
      )}
    </div>
  )
}
